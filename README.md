# Synapse – Real-Time AI Interviewer

A real-time autonomous AI interviewer that conducts technical interviews via video call using streaming full-duplex architecture.

## ✨ Key Features

- **Real-time Audio Processing**: Streaming STT with <1 second response time
- **Intelligent Questioning**: GPT-4o powered adaptive questioning based on resume & job description
- **Natural Voice**: Deepgram streaming TTS for human-like responses
- **Interruption Handling**: Detects when candidate interrupts and adjusts accordingly
- **Voice Activity Detection**: Automatic turn-taking without explicit user input

## 🏗️ Architecture

```
Candidate Speaks → Audio Stream → Streaming STT
                                  ↓
                         Partial Transcript
                                  ↓
                         VAD Detects Silence
                                  ↓
                    LLM (GPT-4o) Generates Response
                                  ↓
                    Streaming TTS Plays Response
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.10+ (for backend development)
- API Keys:
  - OpenAI API Key (GPT-4o)
  - Deepgram API Key (STT & TTS)

### 1. Clone & Setup

```bash
cd synapse-ai-interviewer
cp .env.example .env
# Edit .env with your API keys
```

### 2. Run with Docker Compose

```bash
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- WebSocket: ws://localhost:8000/ws

### 3. Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📋 Project Structure

```
synapse-ai-interviewer/
├── backend/
│   ├── app.py                 # FastAPI main app
│   ├── orchestrator.py        # WebSocket orchestrator
│   ├── stt_handler.py         # Deepgram STT
│   ├── llm_handler.py         # GPT-4o integration
│   ├── tts_handler.py         # Deepgram TTS
│   ├── vad_handler.py         # Voice Activity Detection
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── pages/
│   │   ├── interview.tsx      # Main interview page
│   │   └── index.tsx          # Landing page
│   ├── components/
│   │   ├── VideoStream.tsx    # WebRTC video
│   │   ├── TranscriptPanel.tsx # Live transcript
│   │   └── Controls.tsx
│   ├── package.json
│   └── next.config.js
├── docker-compose.yml
├── .env.example
└── docs/
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    └── DEPLOYMENT.md
```

## 🔑 Environment Variables

Create `.env`:

```
# Backend
DEEPGRAM_API_KEY=your_deepgram_key
OPENAI_API_KEY=your_openai_key
BACKEND_URL=http://localhost:8000

# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## 📡 API Endpoints

### WebSocket
- `GET /ws` - Main WebSocket for real-time audio

### REST
- `POST /api/interview/start` - Initialize interview
- `POST /api/interview/end` - End interview
- `GET /api/interview/{id}/report` - Get interview report

## 🧠 System Flow

1. **Candidate speaks** → Audio streamed to backend
2. **STT processes** → Deepgram transcribes in real-time
3. **VAD detects** → Silence detected (500ms threshold)
4. **LLM reasons** → GPT-4o generates response
5. **TTS plays** → Deepgram converts to speech instantly
6. **Interruption** → If new speech detected, AI stops & listens

## 📊 Performance Targets

- STT latency: <500ms
- LLM response: <300ms
- TTS latency: <100ms
- **Total latency: <1 second**

## 🛠️ Configuration

Edit backend config in `backend/config.py`:

```python
VAD_SILENCE_THRESHOLD = 500  # ms
STT_LANGUAGE = "en"
LLM_MODEL = "gpt-4o"
TTS_VOICE = "aura-asteria-en"
MAX_INTERVIEW_DURATION = 20 * 60  # 20 minutes
```

## 🧪 Testing

```bash
# Run backend tests
cd backend
pytest

# Run frontend tests
cd frontend
npm test
```

## 📚 Documentation

- [Architecture Details](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🤝 Contributing

Contributions welcome! Please follow the existing code style.

## 📄 License

MIT License - see LICENSE file

## 🎯 MVP Roadmap

- [x] WebSocket orchestrator
- [x] Streaming STT integration
- [x] LLM integration
- [x] Streaming TTS
- [ ] VAD & interruption handling
- [ ] Interview scoring & reporting
- [ ] Resume parsing
- [ ] Production deployment

## 🚨 Known Limitations (MVP)

- Single concurrent interview
- Basic VAD (may need tuning)
- No user authentication
- Limited interrupt handling
- No analytics/reporting yet

## 💬 Support

For issues and questions, open an issue on GitHub or contact the team.

---
# synapse-ai-interviewer
