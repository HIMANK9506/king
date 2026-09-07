"""
esp32_client.py
----------------
Thin wrapper around the same /say endpoint your test_send.py script used.
"""

import requests
from config import ESP32_URL


def send_to_buddy(text: str, emotion: str) -> bool:
    try:
        resp = requests.post(ESP32_URL, json={"text": text, "emotion": emotion}, timeout=5)
        resp.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        print(f"[Couldn't reach ESP32: {e}]")
        return False
