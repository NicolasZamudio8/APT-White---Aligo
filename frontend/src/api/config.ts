// API environment configuration
const getApiUrl = (): string => {
  let url = import.meta.env.VITE_API_URL;
  console.log("[Aligo C2] Raw VITE_API_URL from environment:", url);
  if (url) {
    // Defensively ensure URL includes protocol prefix
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    console.log("[Aligo C2] Resolved API URL with protocol:", url);
    return url;
  }
  // Dynamic fallback for production environments
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const originUrl = window.location.origin;
    console.log("[Aligo C2] VITE_API_URL undefined. Falling back to origin:", originUrl);
    return originUrl;
  }
  console.log("[Aligo C2] Local environment fallback URL: http://localhost:8000");
  return 'http://localhost:8000';
};

export const API_URL = getApiUrl();
export const API_BASE_URL = `${API_URL}/api`;
console.log("[Aligo C2] Global API_BASE_URL configured:", API_BASE_URL);
