// API environment configuration
const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Dynamic fallback for production environments
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // In production, default to the current window origin
    return window.location.origin;
  }
  return 'http://localhost:8000';
};

export const API_URL = getApiUrl();
export const API_BASE_URL = `${API_URL}/api`;
