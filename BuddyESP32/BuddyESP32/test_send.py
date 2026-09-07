"""
test_send.py
------------
Quick way to test your BuddyESP32 from the laptop before we build the
full AI companion app. Just run this and it'll send a test message.

Usage:
    python test_send.py <esp32-ip> "your message" happy
Example:
    python test_send.py 192.168.43.55 "Hey buddy, how's it going?" happy

Valid emotions: neutral, happy, excited, love, sleepy, surprised, confused, smug,
sad, angry, adoring, wink, dizzy, shrug, touched, crying, kiss, rage, nervous, starstruck
"""

import sys
import requests

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_send.py <esp32-ip> [\"message\"] [emotion]")
        sys.exit(1)

    ip = sys.argv[1]
    text = sys.argv[2] if len(sys.argv) > 2 else "Hello from my laptop!"
    emotion = sys.argv[3] if len(sys.argv) > 3 else "happy"

    url = f"http://{ip}/say"
    payload = {"text": text, "emotion": emotion}

    print(f"Sending to {url}: {payload}")
    resp = requests.post(url, json=payload, timeout=5)
    print(f"Response: {resp.status_code} {resp.text}")

if __name__ == "__main__":
    main()
