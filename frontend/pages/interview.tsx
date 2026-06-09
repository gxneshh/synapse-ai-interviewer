import Head from 'next/head';
import { useState, useRef, useEffect } from 'react';
import { VideoStream } from '../components/VideoStream';
import { TranscriptPanel } from '../components/TranscriptPanel';
import { Controls } from '../components/Controls';
import { SetupForm } from '../components/SetupForm';
import { startInterview, endInterview, getTranscript } from '../lib/api';

export default function Interview() {
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleStartInterview = async (resume: string, jobDescription: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Initialize interview on backend
      const response = await startInterview(resume, jobDescription);
      const newInterviewId = response.data.interview_id;
      setInterviewId(newInterviewId);
      setInterviewStarted(true);

      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Connect WebSocket
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
      const ws = new WebSocket(wsUrl + '/ws');

      ws.onopen = () => {
        // Send interview ID to backend
        ws.send(JSON.stringify({ interview_id: newInterviewId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'processing') {
            if (data.transcript) {
              setTranscript((prev) => {
                // Update transcript dynamically
                return data.transcript;
              });
            }
          }

          if (data.type === 'audio') {
            // Play AI audio response
            playAudio(data.audio);
          }
        } catch (e) {
          console.error('Message parse error:', e);
        }
      };

      ws.onerror = (event) => {
        setError('WebSocket connection error');
        console.error('WebSocket error:', event);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
      };

      wsRef.current = ws;

      // Fetch transcript periodically
      const transcriptInterval = setInterval(async () => {
        try {
          const transcriptData = await getTranscript(newInterviewId);
          setTranscript(transcriptData.data.transcript);
        } catch (e) {
          console.error('Error fetching transcript:', e);
        }
      }, 1000);

      // Cleanup on component unmount
      return () => {
        clearInterval(transcriptInterval);
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start interview';
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  const handleEndInterview = async () => {
    if (!interviewId) return;

    try {
      await endInterview(interviewId);

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
      }

      setInterviewStarted(false);
      setInterviewId(null);
      setTranscript('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to end interview';
      setError(errorMsg);
    }
  };

  const playAudio = (audioData: string) => {
    // Decode and play audio - implementation depends on audio format
    // This is a placeholder for audio playback logic
    console.log('Playing audio:', audioData);
  };

  const handleVideoError = (errorMsg: string) => {
    setError(`Camera/Mic Error: ${errorMsg}`);
  };

  return (
    <>
      <Head>
        <title>Interview - Synapse</title>
      </Head>

      <main className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Technical Interview</h1>
            <p className="text-gray-400">
              {interviewStarted ? 'Interview in progress...' : 'Set up your interview'}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg text-red-100">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-sm underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {!interviewStarted ? (
            // Setup Phase
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-900 p-8 rounded-lg border border-gray-800">
                <SetupForm
                  onSubmit={handleStartInterview}
                  isLoading={isLoading}
                />
              </div>
            </div>
          ) : (
            // Interview Phase
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video + Controls */}
              <div className="lg:col-span-2">
                <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                  <div className="aspect-video">
                    <VideoStream
                      isActive={interviewStarted}
                      onError={handleVideoError}
                    />
                  </div>

                  <div className="p-6 border-t border-gray-800">
                    <Controls
                      isRunning={interviewStarted}
                      onStart={() => {}}
                      onStop={handleEndInterview}
                    />
                  </div>
                </div>

                {/* Interview Info */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                    <p className="text-gray-400 text-sm">Duration</p>
                    <p className="text-white font-semibold">20 minutes</p>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                    <p className="text-gray-400 text-sm">Status</p>
                    <p className="text-green-400 font-semibold">Live</p>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                    <p className="text-gray-400 text-sm">Interview ID</p>
                    <p className="text-white font-semibold text-xs">{interviewId?.slice(0, 8)}...</p>
                  </div>
                </div>
              </div>

              {/* Transcript */}
              <div className="lg:col-span-1">
                <div className="h-full">
                  <TranscriptPanel
                    transcript={transcript}
                    isLive={interviewStarted}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
