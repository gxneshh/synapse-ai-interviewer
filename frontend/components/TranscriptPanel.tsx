import React, { useEffect, useRef } from 'react';

interface TranscriptPanelProps {
  transcript: string;
  isLive: boolean;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ transcript, isLive }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white">Live Transcript</h3>
        {isLive && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-gray-800 rounded p-3 text-sm"
      >
        {transcript ? (
          <div className="space-y-3">
            {transcript.split('\n\n').map((line, idx) => (
              line.trim() && (
                <div key={idx} className="pb-2 border-b border-gray-700">
                  {line.includes('AI:') ? (
                    <p className="text-blue-400">{line}</p>
                  ) : line.includes('Candidate:') ? (
                    <p className="text-green-400">{line}</p>
                  ) : (
                    <p className="text-gray-300">{line}</p>
                  )}
                </div>
              )
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">Waiting for interview to start...</p>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        {isLive ? 'Recording in progress' : 'Ready to start'}
      </div>
    </div>
  );
};
