# J.A.R.V.I.S - Generation 1 🤖

**J.A.R.V.I.S Gen-1** is a web and CLI conversational AI assistant inspired by Tony Stark's iconic artificial intelligence, powered by NVIDIA NIM (Llama 3.1 70B Instruct) and Microsoft Edge Neural TTS.

---

## ⚡ Features

- **Iron Man HUD Aesthetic**: Sleek futuristic web UI (`index.html`) featuring animated cyber elements and dark-mode styling.
- **High-Performance LLM**: Powered by `meta/llama-3.1-70b-instruct` hosted on NVIDIA NIM for near-instant responses.
- **Lifelike Neural Voice**: Uses `edge-tts` with the `en-GB-RyanNeural` voice to deliver classic British assistant speech.
- **Interactive CLI & Web**: Includes both a colorized terminal interface (`chat.py`) and a Flask web service (`app.py`).

---

## 🚀 Quickstart

### 1. Requirements
```bash
pip install flask openai edge-tts requests
```

### 2. Set NVIDIA API Key
Get your free API key at [build.nvidia.com](https://build.nvidia.com):
```powershell
# Windows PowerShell
$env:NVIDIA_API_KEY="nvapi-your-key-here"

# Or persist globally:
setx NVIDIA_API_KEY "nvapi-your-key-here"
```

### 3. Launch
Run via batch script or python command:
```bash
python app.py
```
Open `http://localhost:5000` in Google Chrome or Edge.
