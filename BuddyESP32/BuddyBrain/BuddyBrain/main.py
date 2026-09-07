"""
main.py
-------
Run this. Press Enter with nothing typed to talk out loud, or type a message
and press Enter to skip the mic entirely. Either way, your buddy reacts.

Usage:
    python main.py
"""

from audio_capture import record_until_silence
from transcriber import Transcriber
from brain import think, is_ollama_available
from esp32_client import send_to_buddy


def main():
    if not is_ollama_available():
        print("\n[Warning] Can't reach Ollama at http://localhost:11434")
        print("Make sure Ollama is installed and running, then restart this app.\n")

    transcriber = Transcriber()
    history = []  # list of {"user": ..., "reply": ...}

    print("\nBuddyBrain is ready.")
    print("Press Enter (no text) to talk, or type a message and press Enter. Type 'quit' to exit.\n")

    while True:
        cmd = input("> ")
        if cmd.strip().lower() in ("quit", "exit"):
            print("Bye!")
            break

        if cmd.strip() == "":
            # Voice mode
            audio = record_until_silence()
            if audio.size == 0:
                print("Didn't catch anything -- try again.")
                continue

            user_text = transcriber.transcribe(audio)
            if not user_text:
                print("Couldn't make out any words -- try again, a bit closer to the mic.")
                continue

            print(f"You said: {user_text}")
        else:
            # Text mode -- skip mic/whisper entirely
            user_text = cmd.strip()

        result = think(history, user_text)
        print(f"Buddy ({result['emotion']}): {result['reply']}")

        send_to_buddy(result["reply"], result["emotion"])

        history.append({"user": user_text, "reply": result["reply"]})
        history[:] = history[-10:]  # keep history from growing unbounded


if __name__ == "__main__":
    main()
