/**
 * Base API client for ASHA backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

function getAuthToken(): string | null {
  return localStorage.getItem("asha_access_token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("asha_access_token", token);
}

export function clearAuthToken(): void {
  localStorage.removeItem("asha_access_token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || `Request failed: ${response.status}`
    );
    (error as Error & { code?: string }).code = data?.error?.code;
    throw error;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
