"""
JARVIS - Step 2: Web interface with voice in/out.

Setup:
    pip install flask openai

Usage:
    Make sure NVIDIA_API_KEY is set (setx NVIDIA_API_KEY "your-key", new terminal).
    Then run:
        python app.py
    Open http://localhost:5000 in Chrome or Edge (needed for mic support).
"""

import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from openai import OpenAI

MODEL = "meta/llama-3.1-8b-instruct"
BASE_URL = "https://integrate.api.nvidia.com/v1"
PROMPT_PATH = Path(__file__).parent / "prompts" / "jarvis_system_prompt.txt"

app = Flask(__name__, static_folder="static")

api_key = os.environ.get("NVIDIA_API_KEY")
if not api_key:
    print("[!] NVIDIA_API_KEY environment variable not set.")
    print('    Run: setx NVIDIA_API_KEY "your-key-here"  then open a new terminal.')
    sys.exit(1)

client = OpenAI(base_url=BASE_URL, api_key=api_key)

if not PROMPT_PATH.exists():
    print(f"[!] Could not find system prompt at {PROMPT_PATH}")
    sys.exit(1)

SYSTEM_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

PROACTIVE_INSTRUCTION = (
    "You have not heard from the user in a little while. In character, "
    "proactively check in on them with ONE short, natural question - for "
    "example about what they are working on, how their day is going, or "
    "whether they need anything. Keep it brief, warm, and in your usual "
    "composed style. Do not greet them formally again, just ask naturally "
    "as if picking the conversation back up."
)

# In-memory conversation history (single user, single session - resets on restart)
history = [{"role": "system", "content": SYSTEM_PROMPT}]


def call_model(messages):
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.6,
        max_tokens=512,
    )
    return response.choices[0].message.content


@app.route("/")
def index():
    return send_from_directory(Path(__file__).parent, "index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True)
    user_text = (data or {}).get("message", "").strip()
    if not user_text:
        return jsonify({"error": "empty message"}), 400

    history.append({"role": "user", "content": user_text})
    try:
        reply = call_model(history)
    except Exception as e:
        history.pop()
        return jsonify({"error": str(e)}), 500

    history.append({"role": "assistant", "content": reply})
    return jsonify({"reply": reply})


@app.route("/proactive", methods=["POST"])
def proactive():
    # Ask the model for a check-in line without permanently adding the
    # instruction itself to history - only the resulting question gets kept.
    temp_messages = history + [{"role": "user", "content": PROACTIVE_INSTRUCTION}]
    try:
        reply = call_model(temp_messages)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    history.append({"role": "assistant", "content": reply})
    return jsonify({"reply": reply})


if __name__ == "__main__":
    print("JARVIS web interface running at http://localhost:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)
