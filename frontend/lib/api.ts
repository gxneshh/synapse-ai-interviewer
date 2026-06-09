import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BACKEND_URL,
});

export const startInterview = (resume: string, jobDescription: string) => {
  return api.post('/api/interview/start', {
    resume,
    job_description: jobDescription,
  });
};

export const endInterview = (interviewId: string) => {
  return api.post(`/api/interview/${interviewId}/end`);
};

export const getTranscript = (interviewId: string) => {
  return api.get(`/api/interview/${interviewId}/transcript`);
};

export default api;
