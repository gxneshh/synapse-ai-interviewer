# API Reference - Synapse AI Interviewer

## REST Endpoints

### 1. Health Check
```
GET /health
```
Returns service health status.

**Response:**
```json
{
  "status": "ok",
  "service": "synapse-ai-interviewer"
}
```

---

### 2. Start Interview
```
POST /api/interview/start
```
Initialize a new interview session.

**Request Body:**
```json
{
  "resume": "Software Engineer with 5 years experience...",
  "job_description": "Senior Backend Engineer - We are looking for..."
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| resume | string | No | Candidate's resume or background |
| job_description | string | No | Job description to tailor interview |

**Response (201):**
```json
{
  "interview_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "initialized"
}
```

**Errors:**
- `500`: Server error during initialization

---

### 3. End Interview
```
POST /api/interview/{interview_id}/end
```
Terminate an interview and get summary.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| interview_id | string | UUID of the interview |

**Response:**
```json
{
  "interview_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_minutes": 19.5,
  "transcript": [
    {
      "speaker": "ai",
      "text": "Hi! Tell me about yourself.",
      "timestamp": "2024-05-21T10:30:00Z"
    },
    {
      "speaker": "candidate",
      "text": "I have 5 years of experience...",
      "timestamp": "2024-05-21T10:30:15Z"
    }
  ],
  "total_exchanges": 12
}
```

**Errors:**
- `404`: Interview not found
- `500`: Error during termination

---

### 4. Get Transcript
```
GET /api/interview/{interview_id}/transcript
```
Retrieve current interview transcript.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| interview_id | string | UUID of the interview |

**Response:**
```json
{
  "interview_id": "550e8400-e29b-41d4-a716-446655440000",
  "transcript": "AI: Hi! Tell me about yourself.\n\nCandidate: I have 5 years of experience..."
}
```

**Errors:**
- `404`: Interview not found

---

## WebSocket Endpoint

### Connection
```
GET /ws
```

Connect to real-time interview stream.

**Connection Flow:**
1. Client connects to `/ws`
2. Client sends initialization message with `interview_id`
3. Server starts streaming responses
4. Client sends audio frames
5. Server sends transcript updates

---

### Message Protocol

#### Message Type: Initialization (Client → Server)
```json
{
  "interview_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Purpose:** Authenticate and link WebSocket to interview session.

---

#### Message Type: Processing Status (Server → Client)
```json
{
  "type": "processing",
  "transcript": "current interim transcription",
  "status": "listening|processing|speaking",
  "is_voice": true
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| type | string | Message type |
| transcript | string | Current live transcript |
| status | string | `listening`, `processing`, or `speaking` |
| is_voice | boolean | Whether voice is detected |

---

#### Message Type: Opening (Server → Client)
```json
{
  "type": "opening",
  "interview_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Interview started"
}
```

**Purpose:** Confirm interview initialization.

---

#### Message Type: Audio Response (Server → Client)
```json
{
  "type": "audio",
  "audio": "<base64_encoded_audio>",
  "text": "What I just said in speech"
}
```

**Purpose:** Send AI response as audio and text.

---

#### Message Type: Keep-Alive (Server → Client)
```json
{
  "type": "keepalive",
  "status": "listening"
}
```

**Purpose:** Maintain connection during silence.

---

#### Message Type: Error (Server → Client)
```json
{
  "type": "error",
  "error": "Connection timeout"
}
```

**Purpose:** Notify of connection/processing errors.

---

### Audio Format

**Transmitted Format:**
- Encoding: PCM (16-bit linear)
- Sample Rate: 16kHz
- Channels: Mono (1)
- Byte Order: Little-endian

**Binary Frame Size:**
- Typically 320 bytes (20ms @ 16kHz)
- Variable based on network conditions

---

## Request/Response Examples

### Example 1: Start Interview with Resume

**Request:**
```bash
curl -X POST http://localhost:8000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{
    "resume": "Senior Software Engineer. 8 years experience in Python and Go.",
    "job_description": "Backend Engineer: Design scalable systems, Python/Go expertise required."
  }'
```

**Response:**
```json
{
  "interview_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "initialized"
}
```

---

### Example 2: WebSocket Connection (JavaScript)

```javascript
// Start interview first
const response = await fetch('http://localhost:8000/api/interview/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resume: "...",
    job_description: "..."
  })
});

const { interview_id } = await response.json();

// Connect WebSocket
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  // Send interview ID
  ws.send(JSON.stringify({ interview_id }));
  
  // Start sending audio
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (event) => {
      const audioData = event.inputBuffer.getChannelData(0);
      // Convert to 16-bit PCM
      const pcm = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        pcm[i] = audioData[i] < 0 ? audioData[i] * 0x8000 : audioData[i] * 0x7FFF;
      }
      ws.send(pcm.buffer);
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
  });
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Transcript:', data.transcript);
  console.log('Status:', data.status);
};
```

---

### Example 3: End Interview

**Request:**
```bash
curl -X POST http://localhost:8000/api/interview/123e4567-e89b-12d3-a456-426614174000/end
```

**Response:**
```json
{
  "interview_id": "123e4567-e89b-12d3-a456-426614174000",
  "duration_minutes": 12.4,
  "transcript": [
    {
      "speaker": "ai",
      "text": "Hi! Tell me about yourself.",
      "timestamp": "2024-05-21T10:30:00Z"
    },
    {
      "speaker": "candidate",
      "text": "I'm a software engineer with 8 years of experience.",
      "timestamp": "2024-05-21T10:30:20Z"
    }
  ],
  "total_exchanges": 6
}
```

---

## Error Codes

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 400 | Bad Request | Invalid parameters | Check request format |
| 404 | Not Found | Interview doesn't exist | Verify interview_id |
| 500 | Internal Server Error | Backend error | Check server logs |
| 503 | Service Unavailable | API dependency down | Retry in 30 seconds |

---

## Rate Limits

- No per-minute limits (MVP)
- Future: 1 interview per user simultaneously

---

## Timeout Behavior

| Operation | Timeout | Action |
|-----------|---------|--------|
| WebSocket connect | 5 seconds | Close connection |
| Audio reception | 10 seconds | Send keepalive |
| LLM response | 10 seconds | Fallback response |
| TTS conversion | 5 seconds | Retry or skip |

---

## Authentication (Future)

Currently no authentication. Future versions will support:
- API Keys
- OAuth 2.0
- JWT tokens
