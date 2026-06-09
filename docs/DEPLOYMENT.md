# Setup & Deployment Guide - Synapse AI Interviewer

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Docker & Docker Compose installed
- API Keys:
  - [OpenAI API Key](https://platform.openai.com/api-keys)
  - [Deepgram API Key](https://console.deepgram.com)

### 1. Clone & Setup
```bash
cd synapse-ai-interviewer
cp .env.example .env
```

### 2. Add API Keys to `.env`
```env
DEEPGRAM_API_KEY=your_deepgram_key_here
OPENAI_API_KEY=your_openai_key_here
```

### 3. Run with Docker
```bash
docker-compose up
```

### 4. Access Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 🛠️ Development Setup (Local)

### Backend Setup

#### 1. Python Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows
```

#### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 3. Environment Variables
```bash
cp ../.env.example .env
# Edit .env with your API keys
```

#### 4. Run Backend
```bash
python app.py
```

Backend runs on: **http://localhost:8000**

#### 5. Run Tests
```bash
pytest tests/
```

---

### Frontend Setup

#### 1. Install Dependencies
```bash
cd frontend
npm install
```

#### 2. Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

#### 3. Run Development Server
```bash
npm run dev
```

Frontend runs on: **http://localhost:3000**

#### 4. Build for Production
```bash
npm run build
npm start
```

#### 5. Run Tests
```bash
npm test
```

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
docker-compose up --build
```

**Services:**
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Redis: localhost:6379

### Stopping Services
```bash
docker-compose down
```

### Viewing Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. Prerequisites
- AWS account with EC2, ECS, or Lambda access
- ECR repository for images

#### 2. Build & Push Docker Images
```bash
# Build images
docker build -t synapse-backend backend/
docker build -t synapse-frontend frontend/

# Tag for ECR
docker tag synapse-backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/synapse-backend:latest
docker tag synapse-frontend:latest <AWS_ACCOUNT_ID>.dkr.ecis.<REGION>.amazonaws.com/synapse-frontend:latest

# Login to ECR
aws ecr get-login-password --region <REGION> | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com

# Push to ECR
docker push <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/synapse-backend:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/synapse-frontend:latest
```

#### 3. ECS Deployment
- Create ECS cluster
- Create task definitions for backend and frontend
- Deploy using docker-compose or CloudFormation

#### 4. Enable HTTPS with ALB
- Create Application Load Balancer
- Configure SSL/TLS certificate
- Route traffic to services

---

### Google Cloud Deployment

#### 1. Build & Push to Artifact Registry
```bash
gcloud builds submit --tag gcr.io/<PROJECT_ID>/synapse-backend
gcloud builds submit --tag gcr.io/<PROJECT_ID>/synapse-frontend
```

#### 2. Deploy to Cloud Run
```bash
gcloud run deploy synapse-backend \
  --image gcr.io/<PROJECT_ID>/synapse-backend \
  --platform managed \
  --memory 2Gi \
  --set-env-vars DEEPGRAM_API_KEY=<KEY>,OPENAI_API_KEY=<KEY>

gcloud run deploy synapse-frontend \
  --image gcr.io/<PROJECT_ID>/synapse-frontend \
  --platform managed \
  --set-env-vars NEXT_PUBLIC_BACKEND_URL=<BACKEND_URL>
```

---

### Azure Deployment

#### 1. Create Resource Group
```bash
az group create --name synapse-rg --location eastus
```

#### 2. Create Container Registry
```bash
az acr create --resource-group synapse-rg --name synapseacr --sku Basic
```

#### 3. Build & Push
```bash
az acr build --registry synapseacr --image synapse-backend:latest backend/
az acr build --registry synapseacr --image synapse-frontend:latest frontend/
```

#### 4. Deploy to Azure Container Instances
```bash
az container create \
  --resource-group synapse-rg \
  --name synapse-backend \
  --image synapseacr.azurecr.io/synapse-backend:latest \
  --environment-variables DEEPGRAM_API_KEY=<KEY> OPENAI_API_KEY=<KEY> \
  --ports 8000
```

---

## 📋 Configuration

### Environment Variables

**.env File:**
```env
# API Keys
DEEPGRAM_API_KEY=gsk_...
OPENAI_API_KEY=sk-...

# Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# AI Models
LLM_MODEL=gpt-4o
STT_MODEL=nova-2
TTS_VOICE=aura-asteria-en

# Interview Settings
MAX_INTERVIEW_DURATION_MINUTES=20
INTERVIEW_LANGUAGE=en
VAD_SILENCE_THRESHOLD_MS=500

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

### Backend Configuration (`backend/config.py`)

```python
settings = {
    # VAD
    "VAD_SILENCE_THRESHOLD_MS": 500,  # Adjust turn-taking sensitivity
    
    # STT
    "STT_SAMPLE_RATE": 16000,
    "STT_ENCODING": "linear16",
    
    # LLM
    "LLM_MAX_TOKENS": 150,  # Keep responses short
    "LLM_TEMPERATURE": 0.7,
    
    # Interview
    "MAX_INTERVIEW_DURATION": 20 * 60,  # 20 minutes
}
```

---

## 🔍 Monitoring & Logging

### Backend Logs
```bash
# View logs
docker-compose logs -f backend

# With grep filtering
docker-compose logs backend | grep ERROR
```

### Frontend Logs
```bash
# Browser console: F12 → Console tab
# Or in dev terminal:
docker-compose logs -f frontend
```

### Performance Metrics
```python
# Add to backend/app.py for timing:
import time

@app.post("/api/interview/start")
async def start_interview(request: InterviewRequest):
    start = time.time()
    # ... code ...
    duration = time.time() - start
    logger.info(f"Interview init took {duration}ms")
```

---

## 🛡️ Security Best Practices

### 1. API Keys
- ✅ Use environment variables (never commit to git)
- ✅ Rotate keys regularly
- ✅ Use service accounts with minimal permissions

### 2. CORS
- ✅ Restrict to known origins in production
- ❌ Don't use `allow_origins=["*"]`

**Update `backend/app.py`:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific domain
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)
```

### 3. Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/interview/start")
@limiter.limit("5/minute")
async def start_interview(request: InterviewRequest):
    ...
```

### 4. HTTPS/TLS
- Use SSL certificates in production
- Configure load balancer with TLS
- Redirect HTTP → HTTPS

### 5. Input Validation
```python
from pydantic import BaseModel, validator

class InterviewRequest(BaseModel):
    resume: str = ""
    job_description: str = ""
    
    @validator('resume')
    def resume_length(cls, v):
        if len(v) > 50000:
            raise ValueError('Resume too long')
        return v
```

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Docker Connection Issues
```bash
# Rebuild containers
docker-compose build --no-cache

# Clear volumes
docker-compose down -v
```

### Deepgram API Errors
- Check API key validity
- Verify account has credits
- Check usage limits

### OpenAI API Errors
- Verify API key and permissions
- Check rate limits (5 RPM free tier)
- Ensure model exists (gpt-4o)

### WebSocket Connection Failed
- Check backend is running
- Verify WebSocket URL matches
- Check firewall/proxy settings

### Audio Not Working
- Check microphone permissions
- Test with `navigator.mediaDevices.getUserMedia()`
- Verify audio format (16-bit PCM, 16kHz)

---

## 📈 Scaling Considerations

### Horizontal Scaling
```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
```

### Load Balancing
```bash
# nginx.conf
upstream backend {
    server backend:8000;
    server backend:8001;
    server backend:8002;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

### Session Management
- Use Redis for state (already configured)
- Implement session expiry
- Clean up old interviews

---

## 🧹 Cleanup

### Remove All Docker Artifacts
```bash
# Stop containers
docker-compose down

# Remove images
docker rmi synapse-backend synapse-frontend

# Remove volumes
docker volume prune -f

# Remove network
docker network prune -f
```

---

## 📚 Additional Resources

- [Deepgram Documentation](https://developers.deepgram.com)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [FastAPI Tutorial](https://fastapi.tiangolo.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Compose Guide](https://docs.docker.com/compose)
