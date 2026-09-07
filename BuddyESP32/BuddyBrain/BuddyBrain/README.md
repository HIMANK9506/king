# BuddyBrain — the companion app

This is the "brain" for your ESP32 buddy. It runs on your laptop, listens to
your mic, transcribes what you say, asks a local AI for a short reply + an
emotion, and sends both to your ESP32 so the face reacts.

```
You speak → mic → Whisper (speech-to-text) → Ollama (local LLM)
                                                    ↓
                                     {"reply": "...", "emotion": "..."}
                                                    ↓
                                        POST to your ESP32's /say
```

Everything runs locally — your voice never leaves your laptop.

## Prerequisites

- Your **BuddyESP32** board flashed and connected to your hotspot (from earlier).
- **Ollama** installed with a model pulled — you already did this for LectureAI:
  ```bash
  ollama pull qwen2.5:7b
  ```
- Your laptop connected to the **same hotspot** as the ESP32.

## Setup

```bash
cd BuddyBrain
python -m venv venv
venv\Scripts\activate        # Windows PowerShell: venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Open `config.py` and set `ESP32_IP` to whatever your board's Serial Monitor showed
(e.g. `10.194.158.33`).

## Run it

```bash
python main.py
```

First run downloads the Whisper model (~150MB) if you haven't already got it
cached from LectureAI. Then you'll see:

```
BuddyBrain is ready.
Press Enter (no text) to talk, or type a message and press Enter. Type 'quit' to exit.

>
```

Two ways to talk to your buddy:
- **Voice**: just press Enter with nothing typed — it starts listening and
  automatically stops once you go quiet for about a second.
- **Text**: type your message and press Enter — this skips the mic and
  Whisper entirely and goes straight to the AI + ESP32. Handy late at night,
  in a quiet room, or if you just don't feel like talking out loud.

Either way, it prints what the buddy decided to reply + feel, and sends that
straight to your ESP32's display.

Type `quit` and press Enter to stop the app.

## Tuning tips

- **Buddy not detecting when you stop talking?** Adjust `SILENCE_THRESHOLD` in
  `config.py` — lower it if your voice isn't registering, raise it if background
  noise is triggering false starts.
- **Replies feel slow?** That's mostly the LLM step. `qwen2.5:3b` responds faster
  than `7b` at some cost to reply quality — swap `OLLAMA_MODEL` in `config.py`.
- **Replies too long for the tiny screen?** The system prompt already asks for
  under ~12 words, but small local models don't always obey perfectly — the
  console still prints the full reply either way.
- **Want a different personality?** Edit `SYSTEM_PROMPT` in `brain.py` — this is
  the one place that shapes how "buddy-like" the responses feel.

## What's next

- MPU6050 motion reactions (shake, tilt, pickup) — layering physical gestures
  on top of the emotional responses
- Push-to-talk via a physical button on the ESP32 instead of pressing Enter
  on your laptop, so the buddy feels less tethered to a keyboard
- Optional: swap Ollama for a hosted API if you want smarter replies at the
  cost of needing internet + API cost

## Web interface (chat from a browser, including your phone)

Instead of the console app, you can run a browser-based chat UI:

```bash
python app.py
```

This starts a local web server. You'll see:
```
On this laptop, open: http://localhost:5000
From your phone (same hotspot), run 'ipconfig' in another Command
Prompt, find your laptop's IPv4 address, and open http://<that-ip>:5000
```

### Skip the Command Prompt next time

Double-click `start_buddy.bat` in this folder instead of typing commands. It
activates the venv, starts the server in its own window (keep that open for
logs), and automatically opens `http://localhost:5000` in your browser after
a few seconds.

**Make it a desktop icon:** right-click `start_buddy.bat` → **Send to** →
**Desktop (create shortcut)**. From then on, double-click the desktop icon
and everything starts on its own.

(Ollama and the ESP32 still need to be running/powered separately — this
just handles the laptop-side server.)

## Getting close to "always on"

True 24/7 isn't possible with a laptop-based brain — it can only run while
your laptop is on. But you can get close to zero-effort:

### 1. Auto-start when you log into Windows

1. Press `Win + R`, type `shell:startup`, press Enter — this opens your
   Windows Startup folder.
2. Right-click `start_buddy_silent.bat` in your `BuddyBrain` folder → **Copy**.
3. Paste it into the Startup folder that just opened (or paste a shortcut to
   it — either works).

From now on, every time you log into Windows, the server starts on its own
in the background — no window, no double-click. It logs its output to
`buddy_log.txt` in the project folder if you ever need to check what
happened (e.g. if Ollama wasn't ready yet).

### 2. Stop your laptop from sleeping

If your laptop goes to sleep, the server pauses with it. Go to
**Settings → System → Power** and set sleep to "Never" while plugged in
(worth reverting this after your project phase, since it does use more
battery/power when idle).

### 3. Keep the ESP32 powered independently

Instead of powering it from your laptop's USB port, use a small USB wall
charger — that way the ESP32 stays on and connected to the hotspot even if
your laptop's closed, and reconnects on its own once the server's back up.

With all three, the buddy effectively runs "whenever your laptop is on and
awake" without you touching a terminal — which is about as close to 24/7 as
a laptop-hosted setup gets. A true always-on version would eventually mean
moving the brain to something like a Raspberry Pi that's always powered —
worth considering later if this becomes a daily-use thing rather than a project.


Open that link on your laptop's browser first to confirm it works. To reach
it from your phone:
1. Make sure your phone is on the **same hotspot** (the phone providing the
   hotspot obviously already is).
2. On the laptop, open a new Command Prompt and run `ipconfig` — look for
   the IPv4 address under the WiFi adapter connected to your hotspot
   (something like `192.168.43.X` or `10.194.158.X`).
3. On your phone's browser, go to `http://<that-ip>:5000`.

The page shows:
- Two status dots (Ollama / ESP32) that update every few seconds
- A text box to type messages
- A 🎤 button to record voice directly in the browser (first use will ask
  for microphone permission)

Both talk to the same buddy — you can mix typing on your laptop and voice
from your phone in the same conversation.

