"""
JARVIS - Step 1: Terminal chat using the NVIDIA API + JARVIS personality prompt.

Setup:
    pip install openai

Usage:
    Set your NVIDIA API key as an environment variable before running:
        Windows (PowerShell):  $env:NVIDIA_API_KEY="nvapi-xxxxxxxx"
        Linux/macOS:           export NVIDIA_API_KEY="nvapi-xxxxxxxx"

    Then run:
        python chat.py

    Type your message and press Enter. Type 'exit' or 'quit' to stop.
"""

import os
import sys
from pathlib import Path
from openai import OpenAI

# ---- Config ----
MODEL = "meta/llama-3.1-8b-instruct"  # swap for a stronger model if you want, e.g. "meta/llama-3.1-70b-instruct"
BASE_URL = "https://integrate.api.nvidia.com/v1"
PROMPT_PATH = Path(__file__).parent / "prompts" / "jarvis_system_prompt.txt"


def load_system_prompt() -> str:
    if not PROMPT_PATH.exists():
        print(f"[!] Could not find system prompt at {PROMPT_PATH}")
        sys.exit(1)
    return PROMPT_PATH.read_text(encoding="utf-8")


def main():
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        print("[!] NVIDIA_API_KEY environment variable not set.")
        print("    Set it first, e.g.:")
        print('    Windows (PowerShell):  $env:NVIDIA_API_KEY="nvapi-xxxxxxxx"')
        print('    Linux/macOS:           export NVIDIA_API_KEY="nvapi-xxxxxxxx"')
        sys.exit(1)

    client = OpenAI(base_url=BASE_URL, api_key=api_key)
    system_prompt = load_system_prompt()

    # Conversation history for this session (in-memory only - persistent
    # memory across sessions comes in Step 2)
    messages = [{"role": "system", "content": system_prompt}]

    print("JARVIS terminal chat. Type 'exit' or 'quit' to stop.\n")

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nJARVIS: Goodbye, sir.")
            break

        if not user_input:
            continue
        if user_input.lower() in ("exit", "quit"):
            print("JARVIS: Goodbye, sir.")
            break

        messages.append({"role": "user", "content": user_input})

        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=0.6,
                max_tokens=1024,
            )
        except Exception as e:
            print(f"[!] API call failed: {e}")
            messages.pop()  # drop the user message that failed so it doesn't pollute history
            continue

        reply = response.choices[0].message.content
        print(f"\nJARVIS: {reply}\n")

        messages.append({"role": "assistant", "content": reply})


if __name__ == "__main__":
    main()
