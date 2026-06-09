# Architecture Guide - Synapse AI Interviewer

## System Overview

Synapse uses a **streaming full-duplex architecture** to enable real-time AI interviewing with <1 second latency.

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Next.js)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WebRTC → Audio Capture → WebSocket Stream              │   │
│  │  ↓                                                        │   │
│  │  Live Transcript Display ← WebSocket Messages            │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ WebSocket
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND ORCHESTRATOR (FastAPI)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Audio Stream Input (16-bit PCM, 16kHz)             │   │
│  │     ↓                                                    │   │
│  │  2. Voice Activity Detection (VAD)                      │   │
│  │     ├─ Detects speech (webrtcvad)                       │   │
│  │     ├─ Tracks silence (500ms threshold)                 │   │
│  │     └─ Triggers turn-taking                             │   │
│  │     ↓                                                    │   │
│  │  3. Streaming STT (Deepgram)                           │   │
│  │     ├─ Real-time transcription                          │   │
│  │     ├─ Interim results (words)                          │   │
│  │     └─ Final results (sentences)                        │   │
│  │     ↓                                                    │   │
│  │  4. LLM Processing (GPT-4o)                            │   │
│  │     ├─ Context: Resume + Job Description               │   │
│  │     ├─ Conversation History                             │   │
│  │     └─ Generate Response                                │   │
│  │     ↓                                                    │   │
│  │  5. Streaming TTS (Deepgram)                           │   │
│  │     ├─ Convert text → audio                             │   │
│  │     └─ Stream chunks for low latency                    │   │
│  │     ↓                                                    │   │
│  │  6. Audio Output Stream                                │   │
│  │     ↓                                                    │   │
│  │  7. Interruption Handling                              │   │
│  │     ├─ Detect new speech while AI talking              │   │
│  │     ├─ Stop TTS immediately                             │   │
│  │     └─ Resume listening                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ├─────────────────────┬─────────────────────┬────────────────┐
       ↓                     ↓                     ↓                ↓
   ┌────────┐          ┌──────────┐        ┌─────────┐      ┌──────────┐
   │Deepgram│          │  OpenAI  │        │WebRTC   │      │  Redis   │
   │STT/TTS │          │  GPT-4o  │        │VAD      │      │ (Cache)  │
   └────────┘          └──────────┘        └─────────┘      └──────────┘
```

## Component Details

### 1. **Frontend (React/Next.js)**
- **VideoStream**: Captures microphone audio using WebRTC API
- **TranscriptPanel**: Displays live conversation
- **Controls**: Start/stop interview buttons
- **SetupForm**: Resume and job description input

### 2. **Backend Orchestrator (FastAPI)**

#### Core Flow
```python
async def process_audio_stream(audio_chunk: bytes):
    # 1. Add to buffer
    audio_buffer.extend(audio_chunk)
    
    # 2. Send to STT (Deepgram)
    await stt.send_audio(audio_chunk)
    
    # 3. Process VAD
    vad_result = vad.process_audio_chunk(audio_chunk)
    
    # 4. If turn complete (500ms silence)
    if vad_result['turn_complete']:
        # 4a. Get transcript
        transcript = stt.get_final_transcript()
        
        # 4b. Send to LLM
        response = await llm.generate_response(transcript)
        
        # 4c. Convert to speech
        audio = await tts.synthesize_speech(response)
        
        # 4d. Send audio to client
        await websocket.send_bytes(audio)
```

### 3. **Speech-to-Text Handler (Deepgram)**
- **Model**: Nova-2 (faster, accurate)
- **Encoding**: Linear16 (raw PCM)
- **Sample Rate**: 16kHz
- **Features**:
  - Streaming support (interim + final results)
  - Utterance end detection (automatic)
  - Language support (configurable)

### 4. **LLM Handler (OpenAI)**
- **Model**: GPT-4o
- **Context**:
  - System prompt: Interviewer role
  - Resume: Candidate background
  - Job description: Role requirements
  - Conversation history: All exchanges
- **Configuration**:
  - Max tokens: 150 (keep responses short)
  - Temperature: 0.7 (balanced creativity)
  - Top-p: 0.9 (nucleus sampling)

### 5. **Text-to-Speech Handler (Deepgram)**
- **Model**: Aura (natural-sounding)
- **Encoding**: Linear16 (PCM)
- **Features**:
  - Streaming support (low latency)
  - Configurable voice personalities
  - Professional tone

### 6. **Voice Activity Detection (WebRTC VAD)**
- **Library**: webrtcvad
- **Aggressiveness**: Level 3 (high sensitivity)
- **Frame Duration**: 20ms
- **Silence Threshold**: 500ms (configurable)
- **Logic**:
  ```
  If speech detected:
      → reset silence counter
      → is_speech_ongoing = true
  
  Else (no speech):
      If is_speech_ongoing:
          → silence_counter++
          
      If silence_counter >= threshold:
          → turn_complete = true
          → trigger LLM response
  ```

## Latency Breakdown

Target: **<1000ms total**

| Component | Latency | Notes |
|-----------|---------|-------|
| VAD Detection | 20-100ms | Detects silence, triggers turn |
| Deepgram STT | 100-300ms | Final transcript processing |
| OpenAI LLM | 300-500ms | Generate response |
| Deepgram TTS | 100-200ms | Convert to speech |
| **Total** | **600-1100ms** | Varies by response complexity |

## Data Flow Diagram

```
CANDIDATE SPEAKS (2 seconds)
    ↓
Audio Chunk Stream → Backend
    ↓
VAD: Detecting Speech (is_voice: true)
    ↓
500ms silence detected
    ↓
[Turn Complete Triggered]
    ↓
STT: "I have 5 years experience"
    ↓
LLM: "That's great! Can you tell me..."
    ↓
TTS: Audio Stream
    ↓
Frontend: Play Audio + Display Text
    ↓
[Waiting for candidate to interrupt or respond]
```

## Interruption Handling

```
AI is playing response
    ↓
[Candidate starts speaking]
    ↓
VAD detects new speech (is_voice: true)
    ↓
Backend sets: ai_speaking = false
    ↓
TTS halts immediately
    ↓
Microphone regains priority
    ↓
New answer processed
```

## Configuration

Located in `config.py`:

```python
# STT Configuration
STT_MODEL = "nova-2"          # Deepgram model
STT_ENCODING = "linear16"     # PCM format
STT_SAMPLE_RATE = 16000       # Hz

# VAD Configuration
VAD_SILENCE_THRESHOLD_MS = 500   # When to trigger turn
VAD_SAMPLE_RATE = 16000          # Hz

# LLM Configuration
LLM_MODEL = "gpt-4o"            # OpenAI model
MAX_TOKENS = 150                  # Keep responses short

# TTS Configuration
TTS_VOICE = "aura-asteria-en"   # Deepgram voice

# Interview Configuration
MAX_INTERVIEW_DURATION_MINUTES = 20
INTERVIEW_LANGUAGE = "en"
```

## WebSocket Protocol

### Message Types

#### 1. Client → Server: Audio Chunk
```
Binary frame with raw audio bytes (16-bit PCM, 16kHz)
```

#### 2. Server → Client: Processing Status
```json
{
  "type": "processing",
  "transcript": "current interim text",
  "status": "listening|processing|speaking",
  "is_voice": true/false
}
```

#### 3. Server → Client: Audio Response
```json
{
  "type": "audio",
  "audio": "base64_encoded_audio_bytes",
  "text": "What I just said"
}
```

#### 4. Server → Client: Interview Events
```json
{
  "type": "event",
  "event": "started|paused|ended|error",
  "data": {}
}
```

## Error Handling

```python
# STT Errors
- Connection timeout → Reconnect with backoff
- Invalid audio → Skip frame
- API rate limit → Queue messages

# LLM Errors
- API timeout → Return fallback response
- Token limit exceeded → Truncate history
- API error → Generic response

# TTS Errors
- Connection error → Retry with backoff
- Invalid text → Sanitize input

# VAD Errors
- Frame too short → Skip
- Invalid audio format → Log and continue
```

## Scalability Considerations

1. **Single Interview**: Current design supports 1 interview per instance
2. **Multiple Instances**: Use load balancer for horizontal scaling
3. **Session Storage**: Redis for state persistence
4. **Rate Limiting**: Implement per-user quotas
5. **Caching**: Cache similar LLM responses

## Performance Optimization

1. **Audio Buffering**: 20ms frames for VAD efficiency
2. **Streaming**: Don't wait for complete sentences
3. **Concurrent Processing**: STT while VAD analyzes
4. **Token Management**: Short response max (150 tokens)
5. **Connection Pooling**: Reuse HTTP/WebSocket connections

## Future Enhancements

- [ ] Multi-turn interruption handling
- [ ] Resume parsing & extraction
- [ ] Interview scoring & analytics
- [ ] Multiple language support
- [ ] Speaker diarization (who spoke when)
- [ ] Real-time emotion detection
- [ ] Custom voice personas
- [ ] Interview recording & playback
