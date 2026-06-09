import React, { useState } from 'react';

interface SetupFormProps {
  onSubmit: (resume: string, jobDescription: string) => void;
  isLoading?: boolean;
}

export const SetupForm: React.FC<SetupFormProps> = ({ onSubmit, isLoading = false }) => {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(resume, jobDescription);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-6">
      <div>
        <label htmlFor="resume" className="block text-sm font-medium text-gray-300 mb-2">
          Resume/Background (Optional)
        </label>
        <textarea
          id="resume"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume or background information..."
          className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-300 mb-2">
          Job Description (Optional)
        </label>
        <textarea
          id="jobDescription"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description..."
          className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
      >
        {isLoading ? 'Initializing Interview...' : 'Start Interview'}
      </button>
    </form>
  );
};
