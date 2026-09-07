"""
ORDIO - The "ultimate" build. Streams text as it generates (like ChatGPT)
and speaks sentence-by-sentence instead of waiting for the whole reply,
which is what fixes the text/speech delay.

Setup:
    pip install flask openai edge-tts requests

    Online mode needs:  NVIDIA_API_KEY environment variable set (setx, new terminal).
    Offline mode needs: Ollama installed and running, with a model pulled,
                         e.g.:  ollama pull llama3.1

Run:
    python app.py
    Open http://localhost:5000 in Chrome (Brave's Shields block the speech
    recognition network call the mic feature needs - see README).
"""

import os
import sys
import asyncio
import tempfile
import subprocess
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, send_file, Response, stream_with_context
from openai import OpenAI
import edge_tts
import requests

PROMPT_PATH = Path(__file__).parent / "prompts" / "ordio_system_prompt.txt"
TTS_VOICE = "en-GB-RyanNeural"

# ---- Online (NVIDIA) config ----
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL = "meta/llama-3.1-70b-instruct"
NVIDIA_VISION_MODEL = "meta/llama-3.2-90b-vision-instruct"

# ---- Offline (Ollama) config ----
OLLAMA_BASE_URL = "http://localhost:11434/v1"
OLLAMA_MODEL = "llama3.1"

# ---- Image generation (NVIDIA NIM) ----
IMAGE_GEN_ENDPOINT = "https://ai.api.nvidia.com/v1/genai/stabilityai/sdxl-turbo"

app = Flask(__name__, static_folder="static")

nvidia_api_key = os.environ.get("NVIDIA_API_KEY")
if not nvidia_api_key:
    print("[!] NVIDIA_API_KEY environment variable not set.")
    print('    Run: setx NVIDIA_API_KEY "your-key-here"  then open a new terminal.')
    sys.exit(1)

nvidia_client = OpenAI(base_url=NVIDIA_BASE_URL, api_key=nvidia_api_key)
ollama_client = OpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama")

if not PROMPT_PATH.exists():
    print(f"[!] Could not find system prompt at {PROMPT_PATH}")
    sys.exit(1)

SYSTEM_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

PROACTIVE_INSTRUCTION = (
    "You have not heard from the user in a little while. In character, "
    "proactively check in on them with ONE short, natural question. Keep it "
    "brief and in your usual composed style. Do not greet them formally "
    "again, just pick the conversation back up naturally."
)

state = {"mode": "online"}
history = [{"role": "system", "content": SYSTEM_PROMPT}]


def get_client_and_model():
    if state["mode"] == "offline":
        return ollama_client, OLLAMA_MODEL
    return nvidia_client, NVIDIA_MODEL


@app.route("/")
def index():
    return send_from_directory(Path(__file__).parent, "index.html")


@app.route("/mode", methods=["GET", "POST"])
def mode():
    if request.method == "POST":
        data = request.get_json(force=True)
        new_mode = (data or {}).get("mode")
        if new_mode in ("online", "offline"):
            state["mode"] = new_mode
    return jsonify({"mode": state["mode"]})


@app.route("/chat_stream", methods=["POST"])
def chat_stream():
    """Streams the reply token-by-token as plain text chunks, so the
    frontend can show it live and start speaking each sentence as soon
    as it's complete - instead of waiting for the whole reply."""
    data = request.get_json(force=True)
    user_text = (data or {}).get("message", "").strip()
    image_data_url = (data or {}).get("image")

    if not user_text and not image_data_url:
        return jsonify({"error": "empty message"}), 400

    if image_data_url:
        if state["mode"] == "offline":
            return jsonify({"error": "Image understanding requires Online mode."}), 400
        content = [
            {"type": "text", "text": user_text or "What do you see in this image?"},
            {"type": "image_url", "image_url": {"url": image_data_url}},
        ]
        history.append({"role": "user", "content": content})
        client, model = nvidia_client, NVIDIA_VISION_MODEL
    else:
        history.append({"role": "user", "content": user_text})
        client, model = get_client_and_model()

    def generate():
        full_reply = ""
        try:
            stream = client.chat.completions.create(
                model=model,
                messages=history,
                temperature=0.6,
                max_tokens=350,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    full_reply += delta
                    yield delta
        except Exception as e:
            yield f"\n[[ORDIO_ERROR]]{str(e)}"
            return
        history.append({"role": "assistant", "content": full_reply})

    return Response(stream_with_context(generate()), mimetype="text/plain")


@app.route("/proactive", methods=["POST"])
def proactive():
    temp_messages = history + [{"role": "user", "content": PROACTIVE_INSTRUCTION}]
    client, model = get_client_and_model()
    try:
        response = client.chat.completions.create(model=model, messages=temp_messages, temperature=0.6, max_tokens=200)
        reply = response.choices[0].message.content
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    history.append({"role": "assistant", "content": reply})
    return jsonify({"reply": reply})


@app.route("/tts", methods=["POST"])
def tts():
    data = request.get_json(force=True)
    text = (data or {}).get("text", "").strip()
    if not text:
        return jsonify({"error": "empty text"}), 400

    fd, path = tempfile.mkstemp(suffix=".mp3")
    os.close(fd)

    async def generate():
        communicate = edge_tts.Communicate(text, TTS_VOICE)
        await communicate.save(path)

    try:
        asyncio.run(generate())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return send_file(path, mimetype="audio/mpeg", as_attachment=False)


@app.route("/run_code", methods=["POST"])
def run_code():
    data = request.get_json(force=True)
    code = (data or {}).get("code", "")
    if not code.strip():
        return jsonify({"error": "empty code"}), 400

    fd, path = tempfile.mkstemp(suffix=".py")
    os.close(fd)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

    try:
        result = subprocess.run([sys.executable, path], capture_output=True, text=True, timeout=10)
        output, error = result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        output, error = "", "Execution timed out after 10 seconds."
    finally:
        os.remove(path)

    return jsonify({"output": output, "error": error})


@app.route("/generate_image", methods=["POST"])
def generate_image():
    data = request.get_json(force=True)
    prompt = (data or {}).get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "empty prompt"}), 400

    headers = {"Authorization": f"Bearer {nvidia_api_key}", "Accept": "application/json"}
    payload = {
        "text_prompts": [{"text": prompt, "weight": 1}],
        "seed": 0,
        "sampler": "K_EULER_ANCESTRAL",
        "steps": 4,
    }
    try:
        resp = requests.post(IMAGE_GEN_ENDPOINT, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        body = resp.json()
        b64 = None
        if "artifacts" in body and len(body["artifacts"]) > 0:
            b64 = body["artifacts"][0].get("base64")
        elif "image" in body:
            b64 = body["image"]
        if not b64:
            return jsonify({"error": "Unexpected response format from the image API.", "raw": body}), 500
        return jsonify({"image": b64})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("ORDIO running at http://localhost:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)
