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
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const audioInputRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const startAudioStreaming = (stream: MediaStream) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (processorNodeRef.current) return; // Already streaming

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create audio source from the microphone stream
      const source = ctx.createMediaStreamSource(stream);
      audioInputRef.current = source;

      // Create ScriptProcessorNode to downsample/process raw PCM
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to 16-bit PCM (Int16Array)
        const pcmData = new Int16Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
          const s = Math.max(-1, Math.min(1, inputBuffer[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send raw PCM binary data over WebSocket
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(pcmData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
    } catch (e) {
      console.error('Failed to start audio streaming:', e);
    }
  };

  const stopAudioStreaming = () => {
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch (e) {}
      processorNodeRef.current.onaudioprocess = null;
      processorNodeRef.current = null;
    }
    if (audioInputRef.current) {
      try {
        audioInputRef.current.disconnect();
      } catch (e) {}
      audioInputRef.current = null;
    }
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (e) {}
      currentAudioSourceRef.current = null;
    }
    mediaStreamRef.current = null;
  };

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
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }

      // Connect WebSocket
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
      const ws = new WebSocket(wsUrl + '/ws');

      ws.onopen = () => {
        // Send interview ID to backend
        ws.send(JSON.stringify({ interview_id: newInterviewId }));
        
        // Start streaming if the stream is already ready
        if (mediaStreamRef.current) {
          startAudioStreaming(mediaStreamRef.current);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'processing') {
            if (data.transcript) {
              setTranscript(data.transcript);
            }
          }

          if (data.type === 'audio') {
            // Play AI audio response
            playAudio(data.audio);
          }

          if (data.type === 'interruption') {
            // Stop playing audio when candidate interrupts
            if (currentAudioSourceRef.current) {
              try {
                currentAudioSourceRef.current.stop();
              } catch (e) {}
              currentAudioSourceRef.current = null;
            }
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
        stopAudioStreaming();
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

      stopAudioStreaming();

      setInterviewStarted(false);
      setInterviewId(null);
      setTranscript('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to end interview';
      setError(errorMsg);
    }
  };

  const playAudio = (audioData: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Stop any current audio source playing
      if (currentAudioSourceRef.current) {
        try {
          currentAudioSourceRef.current.stop();
        } catch (e) {}
        currentAudioSourceRef.current = null;
      }

      // Decode base64 to binary
      const binaryString = window.atob(audioData);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert raw 16-bit PCM bytes to float32
      const rawInt16 = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(rawInt16.length);
      for (let i = 0; i < rawInt16.length; i++) {
        float32Data[i] = rawInt16[i] / 32768.0;
      }

      // Create audio buffer (1 channel, 16000Hz)
      const audioBuffer = ctx.createBuffer(1, float32Data.length, 16000);
      audioBuffer.getChannelData(0).set(float32Data);

      // Create source node and play
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(0);
      currentAudioSourceRef.current = source;
    } catch (err) {
      console.error('Error playing audio:', err);
    }
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
                      onStreamReady={(stream) => {
                        mediaStreamRef.current = stream;
                        startAudioStreaming(stream);
                      }}
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
