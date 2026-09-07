# ORDIO 1 🎙️ - Voice-First Multimodal AI Workspace

**ORDIO 1** is a high-speed conversational AI workspace featuring streaming LLM generation, instant neural speech synthesis, and an executive workspace interface.

---

## 🌟 Key Features

- **⚡ Instant Neural Voice**: Powered by Microsoft Edge TTS (`en-GB-RyanNeural`) delivering fluent, natural-sounding audio responses.
- **🧠 NVIDIA NIM LLM Integration**: Uses `meta/llama-3.1-70b-instruct` for in-depth reasoning and natural dialogue.
- **🖥️ Minimalist Workstation UI**: Clean, responsive web dashboard designed for fast productivity without distraction.

---

## 🚀 Setup

```bash
pip install flask openai edge-tts requests
setx NVIDIA_API_KEY "nvapi-your-key-here"
python app.py
```
Open `http://localhost:5000` in Google Chrome.
