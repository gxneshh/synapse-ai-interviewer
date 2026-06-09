"""
Configuration management for Synapse backend
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Keys
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Server Configuration
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

    # AI Model Configuration
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o")
    STT_MODEL: str = os.getenv("STT_MODEL", "nova-2")
    TTS_VOICE: str = os.getenv("TTS_VOICE", "aura-asteria-en")
    STT_ENCODING: str = "linear16"
    STT_SAMPLE_RATE: int = 16000

    # VAD Configuration
    VAD_SILENCE_THRESHOLD_MS: int = int(os.getenv("VAD_SILENCE_THRESHOLD_MS", "500"))
    VAD_SAMPLE_RATE: int = 16000

    # Interview Configuration
    MAX_INTERVIEW_DURATION_MINUTES: int = int(
        os.getenv("MAX_INTERVIEW_DURATION_MINUTES", "20")
    )
    INTERVIEW_LANGUAGE: str = os.getenv("INTERVIEW_LANGUAGE", "en")

    # Redis Configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))

    class Config:
        env_file = ".env"


settings = Settings()
