# BuddyESP32 🤖 - Physical AI Robotic Companion

**BuddyESP32** is an embodied AI companion robot combining physical **ESP32 hardware** (servo animatronics, dynamic OLED eyes/emotions) with a powerful **Python AI Brain** (Whisper voice recognition, LLM reasoning, and neural text-to-speech).

---

## 🏛️ System Architecture

```
BuddyESP32/
├── BuddyBrain/          # Python AI Backend & Voice Pipeline
│   └── BuddyBrain/
│       ├── app.py           # Flask REST API server
│       ├── brain.py         # LLM reasoning module (OpenAI/Ollama/NVIDIA)
│       ├── audio_capture.py # Microphone streaming & silence detection
│       ├── transcriber.py   # OpenAI Whisper voice-to-text
│       ├── esp32_client.py  # Communicates mood & movements to ESP32 over WiFi
│       └── web/             # Responsive web interaction interface
│
└── BuddyESP32/          # Embedded ESP32 Firmware
    ├── BuddyESP32.ino   # Microcontroller main loop & WiFi web server
    ├── emotions.cpp/.h  # Procedural OLED eye expressions (Happy, Sad, Angry, Thinking)
    ├── motion.cpp/.h    # Servo drivers for head tilt, pan, and nodding
    ├── display_helpers  # Graphics drawing routines
    └── config.h         # Network and hardware configuration
```

---

## 🚀 Quick Setup

### 1. ESP32 Hardware Setup
1. Open `BuddyESP32/BuddyESP32/BuddyESP32.ino` in Arduino IDE.
2. In `config.h`, provide your WiFi SSID and Password:
   ```cpp
   #define WIFI_SSID     "YOUR_WIFI_SSID"
   #define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
   ```
3. Flash the sketch to the ESP32. Open Serial Monitor (`115200` baud) to find the ESP32's assigned IP address.

### 2. Python AI Brain Setup
1. Navigate to the brain directory:
   ```bash
   cd BuddyBrain/BuddyBrain
   ```
2. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your ESP32 IP in `config.py` and run:
   ```bash
   python main.py
   ```
4. Talk into your microphone—Buddy will listen, respond with voice, animate its OLED eyes, and move its head in response!
