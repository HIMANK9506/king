# ORDIO 2

What's new vs Ordio 1:
- **Persistent memory** — conversations now save to a local database (ordio.db) and survive restarts.
- **Multiple saved chats** — sidebar lists past conversations, click to switch between them, "+ New Chat" starts a fresh one.
- **Fast / Smart toggle** — Smart uses the 70B model (sharper, slower). Fast uses the 8B model (quicker, less nuanced). Switch based on what you need in the moment.
- **Explicit Stop button** — appears whenever ORDIO is thinking or speaking; click it to cut it off immediately (typing/speaking also still interrupts automatically).
- Everything from Ordio 1 carries over: streaming replies, sentence-by-sentence speech, online/offline modes, image understanding, code execution, image generation, mic diagnostics.

## Setup
1. Get an NVIDIA API key from https://build.nvidia.com (if you don't already have one set up).
2. `setx NVIDIA_API_KEY "your-key-here"` in PowerShell, then close that window.
3. In this folder: `pip install -r requirements.txt`
4. Double-click `start_ordio2.bat`.
5. Open in **Chrome** (Brave blocks the mic's speech recognition service via Shields).

## Notes
- `ordio.db` is created automatically on first run — it's just a local file, nothing leaves your machine except the actual chat requests to NVIDIA/Ollama.
- Offline mode needs Ollama installed separately (`ollama pull llama3.1`) — optional, ignore if you're not using it.
- Vision (image upload) and `/image` generation only work in Online mode.
