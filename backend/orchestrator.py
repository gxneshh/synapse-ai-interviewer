"""
Orchestrator - Manages real-time streaming orchestration
Coordinates STT, LLM, TTS, and VAD components
"""
import asyncio
import uuid
from datetime import datetime
from stt_handler import STTHandler
from llm_handler import LLMHandler
from tts_handler import TTSHandler
from vad_handler import VADHandler
from config import settings


class InterviewOrchestrator:
    """Coordinates real-time interview components"""

    def __init__(self, resume: str = "", job_description: str = ""):
        self.interview_id = str(uuid.uuid4())
        self.start_time = datetime.now()

        # Initialize components
        self.stt = STTHandler()
        self.llm = LLMHandler(resume_text=resume, job_description=job_description)
        self.tts = TTSHandler()
        self.vad = VADHandler()

        # State management
        self.is_running = False
        self.ai_speaking = False
        self.candidate_speaking = False
        self.conversation_transcript = []

        # Buffers
        self.audio_buffer = bytearray()

    async def initialize(self) -> str:
        """Initialize orchestrator and start interview"""
        try:
            await self.stt.start_streaming()
            self.is_running = True

            # Generate opening question
            opening_response = await self.llm.start_interview()
            self.conversation_transcript.append(
                {"speaker": "ai", "text": opening_response, "timestamp": datetime.now()}
            )

            # Convert opening to speech
            audio = await self.tts.synthesize_speech(opening_response)

            return audio

        except Exception as e:
            print(f"Orchestrator initialization error: {e}")
            return b""

    async def process_audio_stream(self, audio_chunk: bytes) -> dict:
        """
        Process incoming audio chunk from candidate
        Handles VAD, STT, LLM, and TTS orchestration

        Args:
            audio_chunk: Raw audio bytes from WebSocket

        Returns:
            {
                'transcript': str,  # Current transcript
                'ai_response': bytes,  # AI audio response (if available)
                'status': str,
            }
        """
        if not self.is_running:
            return {"transcript": "", "ai_response": b"", "status": "stopped"}

        try:
            # 1. Add to audio buffer
            self.audio_buffer.extend(audio_chunk)

            # 2. Send to STT
            await self.stt.send_audio(audio_chunk)

            # 3. Process VAD
            vad_result = self.vad.process_audio_chunk(audio_chunk)

            result = {
                "transcript": self.stt.get_current_transcript(),
                "ai_response": b"",
                "status": "listening",
                "is_voice": vad_result["is_voice"],
            }

            # 4. If turn complete (candidate finished speaking)
            if vad_result["turn_complete"] and not self.ai_speaking:
                await self._handle_turn_complete()
                result["status"] = "processing"

            return result

        except Exception as e:
            print(f"Audio processing error: {e}")
            return {"transcript": "", "ai_response": b"", "status": "error"}

    async def _handle_turn_complete(self) -> bytes:
        """
        Handle when candidate finishes speaking
        Generate LLM response and convert to speech
        """
        try:
            self.ai_speaking = True

            # Get final transcript from STT
            final_transcript = self.stt.get_final_transcript()
            if final_transcript:
                self.conversation_transcript.append(
                    {
                        "speaker": "candidate",
                        "text": final_transcript,
                        "timestamp": datetime.now(),
                    }
                )

                # Generate AI response
                ai_response = await self.llm.generate_response(final_transcript)
                self.conversation_transcript.append(
                    {
                        "speaker": "ai",
                        "text": ai_response,
                        "timestamp": datetime.now(),
                    }
                )

                # Convert to speech
                audio = await self.tts.synthesize_speech(ai_response)

                return audio

        except Exception as e:
            print(f"Turn handling error: {e}")
        finally:
            self.ai_speaking = False

        return b""

    async def handle_interruption(self):
        """Handle candidate interrupting AI"""
        self.ai_speaking = False
        self.vad.reset()
        print("Interruption detected - AI stopped, listening to candidate")

    async def end_interview(self) -> dict:
        """End the interview and generate summary"""
        try:
            self.is_running = False
            await self.stt.finish()

            duration = (datetime.now() - self.start_time).total_seconds() / 60

            return {
                "interview_id": self.interview_id,
                "duration_minutes": round(duration, 2),
                "transcript": self.conversation_transcript,
                "total_exchanges": len([t for t in self.conversation_transcript]),
            }

        except Exception as e:
            print(f"Error ending interview: {e}")
            return {}

    def get_current_transcript(self) -> str:
        """Get formatted current transcript"""
        transcript_str = ""
        for exchange in self.conversation_transcript:
            speaker = "AI" if exchange["speaker"] == "ai" else "Candidate"
            transcript_str += f"{speaker}: {exchange['text']}\n\n"
        return transcript_str
