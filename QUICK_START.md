# Synapse AI Interviewer - Quick Start Guide

## ⚡ Get Running in 5 Minutes

### Step 1: Setup Environment
```bash
cd synapse-ai-interviewer
cp .env.example .env
```

### Step 2: Add API Keys to `.env`
```env
DEEPGRAM_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

Get your keys:
- 🔗 [Deepgram API Key](https://console.deepgram.com) (Free trial available)
- 🔗 [OpenAI API Key](https://platform.openai.com/api-keys) (Pay-as-you-go)

### Step 3: Start with Docker
```bash
docker-compose up
```

### Step 4: Open Browser
- Frontend: **http://localhost:3000**
- API Docs: **http://localhost:8000/docs**

---

## 🎯 What You Get

### Features Implemented ✅
- ✅ **Real-time Voice Processing**: Stream audio, get instant responses
- ✅ **Streaming STT/TTS**: Deepgram integration for natural speech
- ✅ **Intelligent LLM**: GPT-4o context-aware interviewer
- ✅ **Voice Activity Detection**: Auto turn-taking with 500ms sensitivity
- ✅ **Live Transcript**: See what's being said in real-time
- ✅ **Interruption Handling**: AI stops when candidate interrupts
- ✅ **WebSocket Streaming**: <1 second latency for natural conversations
- ✅ **Docker Containerized**: One-command deployment
- ✅ **Full Documentation**: Architecture, API, deployment guides

---

## 📂 Project Structure

```
synapse-ai-interviewer/
├── backend/
│   ├── app.py              # FastAPI main app
│   ├── orchestrator.py     # Streaming orchestrator (heart of system)
│   ├── stt_handler.py      # Deepgram Speech-to-Text
│   ├── tts_handler.py      # Deepgram Text-to-Speech
│   ├── llm_handler.py      # OpenAI GPT-4o integration
│   ├── vad_handler.py      # Voice Activity Detection
│   ├── config.py           # Configuration management
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Backend container
├── frontend/
│   ├── pages/
│   │   ├── _app.tsx        # Next.js app wrapper
│   │   ├── _document.tsx   # HTML document
│   │   ├── index.tsx       # Landing page
│   │   └── interview.tsx   # Interview page
│   ├── components/
│   │   ├── VideoStream.tsx    # WebRTC video component
│   │   ├── TranscriptPanel.tsx# Live transcript display
│   │   ├── Controls.tsx       # Start/stop buttons
│   │   └── SetupForm.tsx      # Interview setup form
│   ├── lib/
│   │   └── api.ts          # Backend API client
│   ├── styles/
│   │   └── globals.css     # Tailwind CSS
│   ├── package.json        # Node.js dependencies
│   ├── tsconfig.json       # TypeScript config
│   └── Dockerfile          # Frontend container
├── docs/
│   ├── ARCHITECTURE.md     # System design deep-dive
│   ├── API_REFERENCE.md    # REST & WebSocket endpoints
│   └── DEPLOYMENT.md       # Cloud deployment guides
├── docker-compose.yml      # Docker orchestration
├── .env.example            # Environment template
├── .gitignore              # Git ignore patterns
└── README.md               # Overview
```

---

## 🔄 Interview Flow

1. **Start Interview**
   - Paste resume (optional)
   - Paste job description (optional)
   - Click "Start Interview"

2. **AI Listens**
   - Microphone captures your speech
   - Streaming STT transcribes in real-time
   - VAD detects when you stop talking (500ms silence)

3. **AI Responds**
   - LLM generates contextual response (<300ms)
   - TTS converts to natural speech (<100ms)
   - Audio plays immediately

4. **Repeat**
   - Answer the question
   - AI listens and adapts
   - Continue for 20 minutes

5. **End Interview**
   - Get full transcript
   - See interview duration
   - Option to download results

---

## 🔧 Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Testing
```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

---

## 📡 API Examples

### Start Interview
```bash
curl -X POST http://localhost:8000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{"resume":"...", "job_description":"..."}'
```

Response:
```json
{
  "interview_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "initialized"
}
```

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({ interview_id: "..." }));
  // Start sending audio chunks
};
ws.onmessage = (msg) => {
  console.log(JSON.parse(msg.data).transcript);
};
```

### End Interview
```bash
curl -X POST http://localhost:8000/api/interview/550e8400-e29b-41d4-a716-446655440000/end
```

---

## 🎛️ Configuration Options

Edit `.env` to customize:

```env
# Silence threshold for turn-taking (lower = more sensitive)
VAD_SILENCE_THRESHOLD_MS=500

# Interview duration
MAX_INTERVIEW_DURATION_MINUTES=20

# AI Models
LLM_MODEL=gpt-4o
STT_MODEL=nova-2
TTS_VOICE=aura-asteria-en

# Interview language
INTERVIEW_LANGUAGE=en
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -i :8000
kill -9 <PID>
```

### Docker Won't Start
```bash
docker-compose build --no-cache
docker-compose down -v
docker-compose up
```

### Microphone Not Working
- Check browser permissions
- Verify microphone in system settings
- Try Chrome/Edge (best WebRTC support)

### API Key Errors
- Verify key is valid: `echo $DEEPGRAM_API_KEY`
- Check account has credits
- Ensure correct key format

### Latency Issues
- Check network speed
- Monitor API response times in browser console
- Reduce LLM max_tokens if slow

---

## 📊 Performance Targets

| Component | Target | Actual* |
|-----------|--------|---------|
| VAD Detection | <100ms | ~20-50ms |
| STT Response | <500ms | ~200-300ms |
| LLM Generation | <300ms | ~400-600ms** |
| TTS Conversion | <100ms | ~100-200ms |
| **Total Latency** | **<1000ms** | **~800-1200ms** |

*Depends on network and API response times
**Varies with response complexity

---

## 🚀 Next Steps

1. **Test the interview** - Try a sample conversation
2. **Customize system prompt** - Edit LLM persona in `backend/llm_handler.py`
3. **Fine-tune VAD** - Adjust `VAD_SILENCE_THRESHOLD_MS` for your preference
4. **Add scoring** - Implement post-interview evaluation
5. **Deploy to cloud** - Follow deployment guides
6. **Add authentication** - Secure with API keys/OAuth

---

## 📚 Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md) - System design
- [API Reference](./docs/API_REFERENCE.md) - All endpoints
- [Deployment Guide](./docs/DEPLOYMENT.md) - Cloud setup

---

## 🆘 Need Help?

Check these first:
1. `.env` file has valid API keys
2. Backend is running: `curl http://localhost:8000/health`
3. Frontend can reach backend: Check browser console
4. Microphone permissions are granted

---

## 📄 License

MIT - Free to use and modify

---

**Built with ❤️ for real-time AI interviews**

Ready to conduct interviews? Visit **http://localhost:3000** 🎤
