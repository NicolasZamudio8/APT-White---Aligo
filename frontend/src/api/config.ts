// API environment configuration
const getApiUrl = (): string => {
  let url = import.meta.env.VITE_API_URL;
  if (url) {
    // Defensively ensure URL includes protocol prefix
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url;
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
