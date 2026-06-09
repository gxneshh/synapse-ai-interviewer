"""
Voice Activity Detection (VAD) handler using WebRTC VAD
Detects when the user stops speaking to trigger AI response
"""
import webrtcvad
import numpy as np
from collections import deque
from config import settings


class VADHandler:
    """Voice Activity Detection using WebRTC VAD"""

    def __init__(self):
        self.vad = webrtcvad.Vad(3)  # Aggressiveness level (0-3, higher = more aggressive)
        self.sample_rate = settings.VAD_SAMPLE_RATE
        self.frame_duration_ms = 20  # 20ms frames for webrtcvad
        self.frame_size = int(self.sample_rate * self.frame_duration_ms / 1000)

        # Silence tracking
        self.silence_threshold_ms = settings.VAD_SILENCE_THRESHOLD_MS
        self.silence_frames_needed = self.silence_threshold_ms // self.frame_duration_ms

        self.silent_frame_count = 0
        self.is_speech_ongoing = False

    def process_audio_chunk(self, audio_chunk: bytes) -> dict:
        """
        Process audio chunk and detect voice activity
        
        Args:
            audio_chunk: Raw audio bytes (16-bit PCM, 16kHz)
            
        Returns:
            {
                'is_voice': bool,
                'silence_duration_ms': int,
                'turn_complete': bool,  # True when we should give AI turn
            }
        """
        # Convert bytes to numpy array
        audio_data = np.frombuffer(audio_chunk, dtype=np.int16)

        # Split into frames for VAD
        frames = [
            audio_data[i : i + self.frame_size].tobytes()
            for i in range(0, len(audio_data), self.frame_size)
        ]

        results = {
            "is_voice": False,
            "silence_duration_ms": 0,
            "turn_complete": False,
        }

        for frame in frames:
            if len(frame) < self.frame_size * 2:  # Skip incomplete frames
                continue

            try:
                is_speech = self.vad.is_speech(frame, self.sample_rate)
            except Exception as e:
                print(f"VAD error: {e}")
                is_speech = False

            if is_speech:
                # Speech detected
                self.silent_frame_count = 0
                self.is_speech_ongoing = True
                results["is_voice"] = True
            else:
                # No speech detected
                if self.is_speech_ongoing:
                    self.silent_frame_count += 1

                    # Check if silence threshold reached
                    if self.silent_frame_count >= self.silence_frames_needed:
                        results["turn_complete"] = True
                        self.is_speech_ongoing = False

                results["silence_duration_ms"] = (
                    self.silent_frame_count * self.frame_duration_ms
                )

        return results

    def reset(self):
        """Reset VAD state"""
        self.silent_frame_count = 0
        self.is_speech_ongoing = False
