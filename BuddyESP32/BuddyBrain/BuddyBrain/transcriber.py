"""
transcriber.py
--------------
Same approach as your LectureAI project -- faster-whisper running fully
offline on CPU.
"""

import numpy as np
from faster_whisper import WhisperModel

from config import WHISPER_MODEL_SIZE, SAMPLE_RATE


class Transcriber:
    def __init__(self):
        print(f"Loading Whisper model ({WHISPER_MODEL_SIZE})... this can take a moment on first run.")
        self.model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")

    def transcribe(self, audio: np.ndarray) -> str:
        if audio.size == 0:
            return ""
        segments, _info = self.model.transcribe(
            audio,
            language="en",
            vad_filter=True,
            beam_size=1,
        )
        return " ".join(seg.text.strip() for seg in segments).strip()

    def transcribe_file(self, path: str) -> str:
        """
        For audio recorded in a browser (webm/opus, etc). faster-whisper
        decodes the file directly via its bundled `av`/ffmpeg support, so we
        don't need to convert formats ourselves.
        """
        segments, _info = self.model.transcribe(
            path,
            language="en",
            vad_filter=True,
            beam_size=1,
        )
        return " ".join(seg.text.strip() for seg in segments).strip()
