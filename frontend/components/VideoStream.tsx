import React, { useState, useRef, useEffect } from 'react';

interface VideoStreamProps {
  isActive: boolean;
  onError?: (error: string) => void;
  onStreamReady?: (stream: MediaStream) => void;
}

export const VideoStream: React.FC<VideoStreamProps> = ({ isActive, onError, onStreamReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permission, setPermission] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setPermission(true);
          onStreamReady?.(stream);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Camera/microphone access denied';
        onError?.(errorMsg);
        setPermission(false);
      }
    };

    startVideo();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isActive, onError]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {!permission && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="text-center">
            <p className="text-white mb-4">Camera/Microphone access required</p>
            <p className="text-gray-400 text-sm">Please allow access to continue</p>
          </div>
        </div>
      )}

      {permission && (
        <div className="absolute top-4 right-4 bg-red-500 rounded-full w-3 h-3 animate-pulse" />
      )}
    </div>
  );
};
