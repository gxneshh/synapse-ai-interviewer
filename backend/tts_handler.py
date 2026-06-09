"""
Text-to-Speech handler using Deepgram streaming API
Converts text responses to natural-sounding audio in real-time
"""
import asyncio
from deepgram import DeepgramClient, SpeakOptions
from config import settings


class TTSHandler:
    """Streaming Text-to-Speech using Deepgram"""

    def __init__(self):
        self.client = DeepgramClient(api_key=settings.DEEPGRAM_API_KEY)

    async def synthesize_speech(self, text: str) -> bytes:
        """
        Convert text to speech using Deepgram
        
        Args:
            text: Text to convert to speech
            
        Returns:
            Audio bytes (raw PCM)
        """
        try:
            options = SpeakOptions(
                model="aura",
                encoding="linear16",
                container="raw",
            )

            # Make API call to Deepgram
            response = await self.client.speak.v(
                {"text": text},
                options,
            )

            # Response contains audio bytes
            return response.stream.read() if hasattr(response, 'stream') else response

        except Exception as e:
            print(f"TTS error: {e}")
            return b""

    async def stream_speech(self, text: str):
        """
        Stream speech audio in chunks (for low-latency playback)
        
        Args:
            text: Text to convert to speech
            
        Yields:
            Audio chunks (bytes)
        """
        try:
            options = SpeakOptions(
                model="aura",
                encoding="linear16",
                container="raw",
            )

            response = await self.client.speak.v(
                {"text": text},
                options,
            )

            # Stream audio in chunks
            chunk_size = 4096
            while True:
                chunk = response.stream.read(chunk_size)
                if not chunk:
                    break
                yield chunk

        except Exception as e:
            print(f"TTS streaming error: {e}")
