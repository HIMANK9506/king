# J.A.R.V.I.S - Generation 3 (Flagship) 🌌

The flagship release of **J.A.R.V.I.S** featuring dual-mode execution (Cloud NVIDIA NIM + Local Offline Ollama), multimodal vision understanding, image generation, automated local code execution sandbox, and voice synthesis.

---

## 🌟 Key Capabilities

- **🌐 Dual-Engine Operation**:
  - **Online Mode**: High-performance reasoning powered by NVIDIA NIM (`meta/llama-3.1-70b-instruct`).
  - **Offline / Local Mode**: 100% private, offline inference powered by local [Ollama](https://ollama.com) (`llama3.1`).
- **👁️ Multimodal Vision**: Visual reasoning and screenshot inspection powered by `meta/llama-3.2-90b-vision-instruct`.
- **🎨 AI Image Generation**: Instant text-to-image synthesis using Stability AI SDXL-Turbo.
- **⚡ Local Code Execution**: Automated sandboxed Python execution engine that executes code snippets and reports stdout/stderr directly into the conversation.
- **🎙️ Neural Speech & Audio Feedback**: Integrated `edge-tts` audio streaming (`en-GB-RyanNeural`).
- **💻 Futuristic Holographic HUD**: Dynamic web dashboard with real-time waveform visualization, vision drag-and-drop, and terminal logs.

---

## 🚀 Setup & Installation

### 1. Python Environment
```bash
pip install flask openai edge-tts requests
```

### 2. Configure Online Engine (NVIDIA NIM)
```powershell
setx NVIDIA_API_KEY "nvapi-your-key-here"
```

### 3. (Optional) Configure Offline Engine (Ollama)
1. Install Ollama from [ollama.com](https://ollama.com).
2. Pull the model:
   ```bash
   ollama pull llama3.1
   ```

### 4. Launch J.A.R.V.I.S 3
Double-click `start_jarvis_web.bat` or run:
```bash
python app.py
```
Open `http://localhost:5000` in your web browser.
