import { auth } from '@/lib/firebase';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function getAuthToken(): Promise<string | null> {
  if (!auth.currentUser) {
    console.warn('No authenticated user available for API request');
    return null;
  }
  try {
    const token = await auth.currentUser.getIdToken();
    return token;
  } catch (error: any) {
    console.error('Failed to get ID token:', error.code, error.message);
    // Return null to allow unauthenticated requests, but the API will reject with 401
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = error.error || error.message || 'API request failed';
      console.error(`API error [${response.status}]:`, errorMessage);
      return { error: errorMessage };
    }

    // GET requests return JSON, DELETE/204 responses don't have body
    if (response.status === 204) {
      return { data: undefined as any };
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    const errorMessage = error.message || 'Network error';
    console.error('API request failed:', errorMessage);
    return { error: errorMessage };
  }
}

export const apiClient = {
  get: <T,>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T,>(endpoint: string, body: any) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T,>(endpoint: string, body: any) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T,>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
