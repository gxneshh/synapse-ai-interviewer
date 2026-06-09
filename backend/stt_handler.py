"""
Speech-to-Text handler using Deepgram streaming API
Converts audio stream to text in real-time
"""
import asyncio
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
from config import settings


class STTHandler:
    """Streaming Speech-to-Text using Deepgram"""

    def __init__(self):
        self.client = DeepgramClient(api_key=settings.DEEPGRAM_API_KEY)
        self.connection = None
        self.is_connected = False
        self.transcript = ""
        self.final_transcript = ""

    async def start_streaming(self) -> None:
        """Initialize streaming connection"""
        try:
            options = LiveOptions(
                model=settings.STT_MODEL,
                language=settings.INTERVIEW_LANGUAGE,
                encoding="linear16",
                sample_rate=settings.VAD_SAMPLE_RATE,
                channels=1,
                interim_results=True,
                utterance_end_ms=500,
            )

            self.connection = await self.client.listen.live.v(
                {"options": options}
            )
            self.is_connected = True

            # Register event handlers
            self.connection.on(LiveTranscriptionEvents.Open, self._on_open)
            self.connection.on(
                LiveTranscriptionEvents.Transcript, self._on_transcript
            )
            self.connection.on(LiveTranscriptionEvents.Close, self._on_close)
            self.connection.on(LiveTranscriptionEvents.Error, self._on_error)

        except Exception as e:
            print(f"STT connection error: {e}")
            self.is_connected = False

    def _on_open(self, *args):
        """Called when connection opens"""
        print("STT connection opened")

    def _on_transcript(self, result, **kwargs):
        """Handle transcript events"""
        transcript = result.channel.alternatives[0].transcript

        if not result.is_final:
            # Interim result
            self.transcript = transcript
        else:
            # Final result
            self.final_transcript = transcript
            self.transcript = ""

    def _on_close(self, *args):
        """Called when connection closes"""
        print("STT connection closed")
        self.is_connected = False

    def _on_error(self, error, **kwargs):
        """Handle errors"""
        print(f"STT error: {error}")
        self.is_connected = False

    async def send_audio(self, audio_chunk: bytes) -> None:
        """
        Send audio chunk to Deepgram
        
        Args:
            audio_chunk: Raw audio bytes (16-bit PCM, 16kHz)
        """
        if self.connection and self.is_connected:
            try:
                await self.connection.send(audio_chunk)
            except Exception as e:
                print(f"Error sending audio: {e}")

    def get_current_transcript(self) -> str:
        """Get current interim transcript"""
        return self.transcript

    def get_final_transcript(self) -> str:
        """Get final transcript"""
        final = self.final_transcript
        self.final_transcript = ""
        return final

    async def finish(self) -> None:
        """Close the streaming connection"""
        if self.connection:
            try:
                await self.connection.finish()
                self.is_connected = False
            except Exception as e:
                print(f"Error finishing STT: {e}")
