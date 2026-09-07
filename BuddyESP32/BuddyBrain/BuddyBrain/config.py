"""
config.py
---------
Fill in your ESP32's IP address (the one printed on its Serial Monitor / OLED
after it connects to your hotspot).
"""

ESP32_IP = "10.194.158.33"          # <-- update this if it changes
ESP32_URL = f"http://{ESP32_IP}/say"

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b"          # same model you already pulled for LectureAI

# Must exactly match the Emotion enum in BuddyESP32/emotions.h --
# if you add new expressions on the firmware side, add the word here too.
VALID_EMOTIONS = [
    "neutral", "happy", "excited", "love", "sleepy", "surprised", "confused",
    "smug", "sad", "angry", "adoring", "wink", "dizzy", "shrug", "touched",
    "crying", "kiss", "rage", "nervous", "starstruck",
]

# Audio recording settings
SAMPLE_RATE = 16000
SILENCE_THRESHOLD = 0.02      # lower = more sensitive to quiet speech
SILENCE_DURATION = 1.2        # seconds of quiet before we consider you done talking
MAX_RECORD_SECONDS = 15       # hard cap so a stuck mic doesn't record forever

# Whisper model size: "base" is fast; "small" is more accurate but slower on CPU
WHISPER_MODEL_SIZE = "base"
