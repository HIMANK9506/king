"""
app.py
------
Web version of BuddyBrain. Run this instead of main.py to get a browser
chat interface -- type or record voice, see live status of the ESP32 and
Ollama, and reach it from your phone too (same hotspot).

Usage:
    python app.py
"""

import os
import tempfile

import requests
from flask import Flask, request, jsonify, render_template

from config import ESP32_URL, OLLAMA_URL
from transcriber import Transcriber
from brain import think, is_ollama_available
from esp32_client import send_to_buddy

app = Flask(__name__, template_folder="web")

transcriber = Transcriber()
history = []  # list of {"user": ..., "reply": ...}


def _esp32_reachable() -> bool:
    health_url = ESP32_URL.replace("/say", "/health")
    try:
        r = requests.get(health_url, timeout=2)
        return r.ok
    except requests.exceptions.RequestException:
        return False


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    return jsonify({
        "ollama": is_ollama_available(),
        "esp32": _esp32_reachable(),
    })


@app.route("/api/chat", methods=["POST"])
def api_chat():
    data = request.get_json(silent=True) or {}
    user_text = str(data.get("text", "")).strip()
    if not user_text:
        return jsonify({"error": "empty message"}), 400

    result = think(history, user_text)
    send_to_buddy(result["reply"], result["emotion"])
    history.append({"user": user_text, "reply": result["reply"]})
    history[:] = history[-10:]

    return jsonify({"user_text": user_text, "reply": result["reply"], "emotion": result["emotion"]})


@app.route("/api/voice", methods=["POST"])
def api_voice():
    audio_file = request.files.get("audio")
    if not audio_file:
        return jsonify({"error": "no audio uploaded"}), 400

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        user_text = transcriber.transcribe_file(tmp_path)
    finally:
        os.remove(tmp_path)

    if not user_text:
        return jsonify({"error": "couldn't make out any words -- try again"}), 200

    result = think(history, user_text)
    send_to_buddy(result["reply"], result["emotion"])
    history.append({"user": user_text, "reply": result["reply"]})
    history[:] = history[-10:]

    return jsonify({"user_text": user_text, "reply": result["reply"], "emotion": result["emotion"]})


if __name__ == "__main__":
    if not is_ollama_available():
        print("\n[Warning] Can't reach Ollama at http://localhost:11434")
        print("Make sure Ollama is installed and running.\n")

    print("BuddyBrain web server starting...")
    print("On this laptop, open: http://localhost:5000")
    print("From your phone (same hotspot), run 'ipconfig' in another Command")
    print("Prompt, find your laptop's IPv4 address, and open http://<that-ip>:5000\n")

    app.run(host="0.0.0.0", port=5000, threaded=True)
