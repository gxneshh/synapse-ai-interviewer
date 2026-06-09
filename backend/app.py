"""
FastAPI main application
Handles WebSocket connections and REST endpoints for real-time interviews
"""
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from orchestrator import InterviewOrchestrator
from config import settings

# Initialize FastAPI
app = FastAPI(title="Synapse AI Interviewer", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active interviews
active_interviews = {}


class InterviewRequest(BaseModel):
    """Request model for starting an interview"""

    resume: str = ""
    job_description: str = ""


class InterviewResponse(BaseModel):
    """Response model for interview metadata"""

    interview_id: str
    status: str


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "synapse-ai-interviewer"}


@app.post("/api/interview/start")
async def start_interview(request: InterviewRequest) -> InterviewResponse:
    """
    Start a new interview session
    
    Args:
        resume: Candidate's resume text
        job_description: Job description
        
    Returns:
        Interview metadata with ID
    """
    try:
        # Create orchestrator
        orchestrator = InterviewOrchestrator(
            resume=request.resume, job_description=request.job_description
        )

        # Initialize and get opening audio
        opening_audio = await orchestrator.initialize()

        # Store in active interviews
        active_interviews[orchestrator.interview_id] = orchestrator

        return InterviewResponse(
            interview_id=orchestrator.interview_id, status="initialized"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/{interview_id}/end")
async def end_interview(interview_id: str):
    """
    End an interview session
    
    Args:
        interview_id: ID of the interview to end
        
    Returns:
        Interview summary
    """
    if interview_id not in active_interviews:
        raise HTTPException(status_code=404, detail="Interview not found")

    try:
        orchestrator = active_interviews[interview_id]
        summary = await orchestrator.end_interview()

        # Remove from active
        del active_interviews[interview_id]

        return summary

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/interview/{interview_id}/transcript")
async def get_transcript(interview_id: str):
    """Get current interview transcript"""
    if interview_id not in active_interviews:
        raise HTTPException(status_code=404, detail="Interview not found")

    orchestrator = active_interviews[interview_id]
    return {
        "interview_id": interview_id,
        "transcript": orchestrator.get_current_transcript(),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for real-time interview
    Handles bidirectional audio streaming
    """
    await websocket.accept()
    interview_id = None

    try:
        # Wait for initialization message with interview ID
        init_message = await websocket.receive_text()
        data = json.loads(init_message)

        interview_id = data.get("interview_id")
        if not interview_id or interview_id not in active_interviews:
            await websocket.send_json({"error": "Invalid interview ID"})
            await websocket.close()
            return

        orchestrator = active_interviews[interview_id]

        # Send opening audio to client
        opening_message = {
            "type": "opening",
            "interview_id": interview_id,
            "message": "Interview started",
        }
        await websocket.send_json(opening_message)

        # Send the opening audio bytes if available
        if getattr(orchestrator, "opening_audio", None):
            import base64
            audio_b64 = base64.b64encode(orchestrator.opening_audio).decode("utf-8")
            await websocket.send_json({
                "type": "audio",
                "audio": audio_b64
            })

        # Main streaming loop
        while orchestrator.is_running:
            try:
                # Receive audio chunk from client (binary)
                data = await asyncio.wait_for(websocket.receive_bytes(), timeout=1.0)

                # Process audio
                result = await orchestrator.process_audio_stream(data)

                # Send response back
                response = {
                    "type": "processing",
                    "transcript": result.get("transcript", ""),
                    "status": result.get("status", "listening"),
                    "is_voice": result.get("is_voice", False),
                }

                await websocket.send_json(response)

                # Send interruption signal if detected
                if result.get("interrupted"):
                    await websocket.send_json({"type": "interruption"})

                # Send response audio if generated
                ai_audio = result.get("ai_response")
                if ai_audio:
                    import base64
                    audio_b64 = base64.b64encode(ai_audio).decode("utf-8")
                    await websocket.send_json({
                        "type": "audio",
                        "audio": audio_b64
                    })

            except asyncio.TimeoutError:
                # Send keep-alive message
                await websocket.send_json(
                    {
                        "type": "keepalive",
                        "status": "listening",
                    }
                )
            except WebSocketDisconnect:
                print(f"Client disconnected: {interview_id}")
                break
            except Exception as e:
                print(f"WebSocket error: {e}")
                await websocket.send_json({"error": str(e)})
                break

    except Exception as e:
        print(f"WebSocket connection error: {e}")

    finally:
        # Cleanup
        if interview_id and interview_id in active_interviews:
            await active_interviews[interview_id].end_interview()
            del active_interviews[interview_id]


@app.on_event("startup")
async def startup():
    """Application startup"""
    print(f"Synapse AI Interviewer starting on {settings.BACKEND_HOST}:{settings.BACKEND_PORT}")


@app.on_event("shutdown")
async def shutdown():
    """Application shutdown - cleanup active interviews"""
    for interview_id in list(active_interviews.keys()):
        try:
            await active_interviews[interview_id].end_interview()
        except Exception as e:
            print(f"Error closing interview {interview_id}: {e}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        log_level="info",
    )
