"""
audio_capture.py
-----------------
Records from the default microphone and automatically stops once you've
been quiet for SILENCE_DURATION seconds, so you don't have to manually
press a key to end recording -- just talk, then stop talking.
"""

import time
import numpy as np
import sounddevice as sd

from config import SAMPLE_RATE, SILENCE_THRESHOLD, SILENCE_DURATION, MAX_RECORD_SECONDS


def record_until_silence() -> np.ndarray:
    """
    Blocks until the user has spoken and then gone quiet, or until
    MAX_RECORD_SECONDS is hit. Returns a 1-D float32 numpy array of audio.
    """
    chunk_duration = 0.1  # seconds per analysis chunk
    chunk_frames = int(SAMPLE_RATE * chunk_duration)

    recorded_chunks = []
    silence_chunks_needed = int(SILENCE_DURATION / chunk_duration)
    max_chunks = int(MAX_RECORD_SECONDS / chunk_duration)

    silent_streak = 0
    has_spoken = False

    print("Listening... (speak now)")

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="float32") as stream:
        for _ in range(max_chunks):
            chunk, _overflowed = stream.read(chunk_frames)
            chunk = chunk.flatten()
            recorded_chunks.append(chunk)

            volume = np.sqrt(np.mean(chunk ** 2))  # RMS amplitude

            if volume > SILENCE_THRESHOLD:
                has_spoken = True
                silent_streak = 0
            elif has_spoken:
                silent_streak += 1
                if silent_streak >= silence_chunks_needed:
                    break

    audio = np.concatenate(recorded_chunks) if recorded_chunks else np.array([], dtype="float32")
    print(f"Done recording ({len(audio) / SAMPLE_RATE:.1f}s captured).")
    return audio
