# Testing Guide - Synapse AI Interviewer

## Pre-Flight Checks

### 1. Environment Setup
```bash
cd synapse-ai-interviewer

# Check .env file exists and has keys
cat .env
# Should contain:
# - DEEPGRAM_API_KEY=gsk_...
# - OPENAI_API_KEY=sk-...
```

### 2. API Keys Validation
```bash
# Test Deepgram API Key
curl -X GET "https://api.deepgram.com/v1/status" \
  -H "Authorization: Token $DEEPGRAM_API_KEY"

# Test OpenAI API Key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | grep gpt-4o
```

---

## Unit Testing

### Backend Tests
```bash
cd backend

# Install test dependencies
pip install pytest pytest-asyncio httpx

# Create tests/ directory
mkdir -p tests

# Run tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=. --cov-report=html
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm test

# With coverage
npm test -- --coverage
```

---

## Integration Testing

### 1. Start Services
```bash
docker-compose up -d
docker-compose logs -f
```

### 2. Health Check
```bash
curl http://localhost:8000/health
# Expected: {"status": "ok", "service": "synapse-ai-interviewer"}
```

### 3. Start Interview via API
```bash
INTERVIEW_ID=$(curl -s -X POST http://localhost:8000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{"resume":"Software Engineer","job_description":"Backend Role"}' \
  | jq -r '.interview_id')

echo "Interview ID: $INTERVIEW_ID"
```

### 4. WebSocket Connection Test
```bash
# Using websocat (install: brew install websocat)
websocat ws://localhost:8000/ws
# Type: {"interview_id":"<ID>"}
# Press Enter
# Should connect and receive messages
```

### 5. Get Transcript
```bash
curl http://localhost:8000/api/interview/$INTERVIEW_ID/transcript
```

### 6. End Interview
```bash
curl -X POST http://localhost:8000/api/interview/$INTERVIEW_ID/end
```

---

## Manual Testing (Browser)

### Step 1: Open Frontend
```
http://localhost:3000
```

### Step 2: Start Interview
- Click "Start Interview"
- (Optional) Paste resume text
- (Optional) Paste job description
- Click "Start Interview"

### Step 3: Grant Permissions
- Browser asks for camera/microphone access
- Click "Allow"
- Video preview appears with recording indicator

### Step 4: Conduct Interview
- Wait for AI to ask opening question
- Speak into microphone for 5-10 seconds
- AI should respond within 1-2 seconds
- See live transcript appear
- Continue conversation

### Step 5: Test Interruption
- While AI is speaking, interrupt with new audio
- AI should stop and listen
- New response should be generated

### Step 6: End Interview
- Click "End Interview"
- Should see full transcript
- Interview duration and statistics

---

## Performance Testing

### Latency Measurement

**Backend Timing:**
Add to `backend/app.py`:
```python
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/api/interview/start")
async def start_interview(request: InterviewRequest):
    t0 = time.time()
    orchestrator = InterviewOrchestrator(...)
    opening = await orchestrator.initialize()
    t1 = time.time()
    logger.info(f"Interview init: {(t1-t0)*1000:.1f}ms")
    return {...}
```

Check logs:
```bash
docker-compose logs backend | grep "Interview init"
```

**Frontend Timing:**
Add to browser console:
```javascript
// Measure WebSocket latency
const ws = new WebSocket('ws://localhost:8000/ws');
let latencies = [];

ws.onopen = () => {
  const start = performance.now();
  ws.send(JSON.stringify({ interview_id: "..." }));
  
  ws.onmessage = (msg) => {
    const latency = performance.now() - start;
    latencies.push(latency);
    console.log(`Latency: ${latency.toFixed(1)}ms`);
  };
};
```

### Load Testing

```bash
# Install locust
pip install locust

# Create locustfile.py in backend/
```

**locustfile.py:**
```python
from locust import HttpUser, task, between

class InterviewUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def start_interview(self):
        self.client.post("/api/interview/start", json={
            "resume": "Test resume",
            "job_description": "Test job"
        })
```

Run load test:
```bash
locust -f backend/locustfile.py --host=http://localhost:8000
```

---

## Edge Case Testing

### 1. No Audio Input
- Don't speak for 30 seconds
- Backend should timeout gracefully
- Check error handling

### 2. Rapid Fire Audio
- Speak very quickly
- AI should buffer and process
- No crashes or dropped frames

### 3. Network Interruption
- Disconnect internet during interview
- Reconnect
- Should resume or error gracefully

### 4. API Rate Limits
- Hit OpenAI or Deepgram rate limits
- Should return error, not crash
- Check fallback responses

### 5. Invalid API Keys
- Set wrong API key in .env
- Try to start interview
- Should show clear error message

### 6. Missing Resume/Job Description
- Start interview with empty fields
- Should work fine with generic questions
- No crashes

---

## Browser Console Testing

Press F12 → Console and test:

```javascript
// 1. Check API connectivity
fetch('http://localhost:8000/health').then(r => r.json()).then(console.log)

// 2. Check WebSocket availability
new WebSocket('ws://localhost:8000/ws')

// 3. Check microphone permission
navigator.permissions.query({name: 'microphone'})

// 4. Get microphone stream
navigator.mediaDevices.getUserMedia({audio: true})
```

---

## Debugging

### Backend Debug Mode
```bash
# Enable debug logging
export PYTHONUNBUFFERED=1
cd backend
python -m uvicorn app:app --reload --log-level debug
```

### Frontend Debug Mode
```bash
cd frontend
npm run dev
# Check console and network tabs in browser dev tools
```

### Docker Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Follow specific error
docker-compose logs backend | grep ERROR
```

---

## Checklist for MVP Validation

- [ ] Docker containers start without errors
- [ ] Frontend loads at http://localhost:3000
- [ ] API health check returns ok
- [ ] Can start interview via REST API
- [ ] WebSocket connects successfully
- [ ] Microphone permission granted
- [ ] Audio streams to backend
- [ ] STT produces transcripts
- [ ] LLM generates responses
- [ ] TTS audio plays
- [ ] Live transcript updates
- [ ] Interruption handling works
- [ ] Interview ends cleanly
- [ ] No latency > 2 seconds
- [ ] Conversation feels natural

---

## Known Limitations (MVP)

- ⚠️ Single interview per instance
- ⚠️ No user authentication
- ⚠️ No interview recording
- ⚠️ No scoring/analytics
- ⚠️ Basic interruption detection
- ⚠️ English language only
- ⚠️ No resume parsing

---

## Production Testing Checklist

- [ ] HTTPS/TLS enabled
- [ ] CORS restricted to known domains
- [ ] Rate limiting configured
- [ ] API keys rotated
- [ ] Monitoring alerts set up
- [ ] Error tracking (e.g., Sentry)
- [ ] Load testing passed
- [ ] Security audit completed
- [ ] Database backups configured
- [ ] Disaster recovery plan

---

## Support

If tests fail:
1. Check `.env` file has valid API keys
2. Verify Docker daemon is running
3. Check internet connectivity
4. Look at Docker logs: `docker-compose logs`
5. Test API keys directly with curl
6. Check browser console for frontend errors
