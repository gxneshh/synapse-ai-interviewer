import React from 'react';

interface ControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  isLoading?: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  isRunning,
  onStart,
  onStop,
  isLoading = false,
}) => {
  return (
    <div className="flex gap-4 justify-center">
      <button
        onClick={onStart}
        disabled={isRunning || isLoading}
        className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
      >
        {isLoading ? 'Starting...' : 'Start Interview'}
      </button>

      <button
        onClick={onStop}
        disabled={!isRunning}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
      >
        End Interview
      </button>
    </div>
  );
};
