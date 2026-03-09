import { toApiUrl } from "@/lib/api-url";

// Custom fetch wrapper to inject JWT token
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers);
  const method = (options.method || 'GET').toUpperCase();
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const requestInit: RequestInit = { ...options, headers };
  if (method === 'GET' && !requestInit.cache) {
    requestInit.cache = 'no-store';
  }

  const res = await fetch(toApiUrl(url), requestInit);
  
  if (res.status === 401 && window.location.pathname !== '/auth') {
    localStorage.removeItem('token');
    window.location.href = '/auth';
  }
  
  return res;
}
