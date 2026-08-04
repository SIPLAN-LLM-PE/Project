export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const resolveApiUrl = (url) => {
  if (typeof url !== 'string') return url;
  return url.replace(/^http:\/\/localhost:8000\/api\/v1/, API_BASE_URL);
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const installApiFetchPatch = () => {
  if (typeof window === 'undefined' || window.__sigejaFetchPatched) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const nextInit = { ...init };
    const headers = new Headers(nextInit.headers || {});
    const authHeaders = getAuthHeaders();
    Object.entries(authHeaders).forEach(([key, value]) => {
      if (!headers.has(key)) headers.set(key, value);
    });
    nextInit.headers = headers;

    if (typeof input === 'string') {
      return originalFetch(resolveApiUrl(input), nextInit);
    }

    return originalFetch(input, nextInit);
  };

  window.__sigejaFetchPatched = true;
};
