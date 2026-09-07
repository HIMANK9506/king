"""
brain.py
--------
Sends the transcribed speech (plus a bit of recent conversation history) to
a local LLM via Ollama, and asks it to reply as your ESP32 buddy -- with a
short spoken-style reply AND a matching emotion from the fixed list the
firmware understands.
"""

import json
import re
import requests

from config import OLLAMA_URL, OLLAMA_MODEL, VALID_EMOTIONS

SYSTEM_PROMPT = f"""You are a small desk buddy robot with a tiny OLED face. You are
talking to your one person, out loud, as a companion -- warm, a little playful,
never robotic-sounding.

Rules:
- Reply in ONE short sentence, ideally under 12 words. Your screen is tiny.
- Pick exactly one emotion from this list that matches your reply's feeling:
  {", ".join(VALID_EMOTIONS)}
- Respond with ONLY a JSON object, nothing else, no markdown fences, in this
  exact shape: {{"reply": "...", "emotion": "..."}}
"""


def _build_prompt(history: list, user_text: str) -> str:
    convo = ""
    for turn in history[-4:]:  # keep only the last few exchanges for context
        convo += f"Them: {turn['user']}\nYou: {turn['reply']}\n"
    convo += f"Them: {user_text}\nYou:"
    return SYSTEM_PROMPT + "\n\nConversation so far:\n" + convo


def _extract_json(raw: str) -> dict:
    # Strip markdown fences if the model added them despite instructions
    cleaned = re.sub(r"```json|```", "", raw).strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fall back to finding the first {...} block
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                data = {}
        else:
            data = {}

    reply = str(data.get("reply", "")).strip() or cleaned[:60] or "..."
    emotion = str(data.get("emotion", "")).strip().lower()
    if emotion not in VALID_EMOTIONS:
        emotion = "neutral"
    return {"reply": reply, "emotion": emotion}


def is_ollama_available() -> bool:
    try:
        requests.get(OLLAMA_URL.replace("/api/generate", ""), timeout=2)
        return True
    except requests.exceptions.RequestException:
        return False


def think(history: list, user_text: str) -> dict:
    """
    Returns {"reply": str, "emotion": str}. Falls back gracefully if Ollama
    is unreachable or returns something unparsable.
    """
    prompt = _build_prompt(history, user_text)
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=90,
        )
        resp.raise_for_status()
        raw = resp.json().get("response", "")
    except requests.exceptions.RequestException as e:
        print(f"[Ollama error detail: {e}]")  # full detail stays in the console
        return {"reply": "Can't reach my brain", "emotion": "confused"}

    return _extract_json(raw)
