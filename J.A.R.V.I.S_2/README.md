# J.A.R.V.I.S - Generation 2 ⚡

**J.A.R.V.I.S Gen-2** expands upon the original assistant with enhanced prompt intelligence, low-latency streaming speech generation, and an improved web interface.

---

## 🚀 Enhancements over Gen-1

- **Expanded System Architecture**: Refined persona prompt (`prompts/jarvis_system_prompt.txt`) emphasizing concise executive summaries, proactive suggestions, and situational awareness.
- **Optimized Voice Streaming**: Faster audio chunk synthesis with `edge-tts` `en-GB-RyanNeural`.
- **Improved Front-End HUD**: Fluid animations, audio response wave bars, and instant voice-to-text input.

---

## 🛠️ Getting Started

### 1. Installation
```bash
pip install flask openai edge-tts requests
```

### 2. Configure API Key
```powershell
setx NVIDIA_API_KEY "nvapi-your-key-here"
```

### 3. Run
Execute `start_jarvis_web.bat` or run:
```bash
python app.py
```
Visit `http://localhost:5000` to interact with J.A.R.V.I.S.
