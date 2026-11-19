/**
 * Base API client for ASHA backend.
 * Reads the access token from the Zustand persisted store (asha-auth in localStorage).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

function getAuthToken(): string | null {
  // Read from Zustand persist storage — single source of truth
  try {
    const raw = localStorage.getItem("asha-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

export function setAuthToken(_token: string): void {
  // No-op — token is managed by Zustand store via setAuth()
  // Kept for backwards compatibility in case any code still calls it
}

export function clearAuthToken(): void {
  // No-op — token is cleared by Zustand store via clearAuth()
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
      data?.error?.message || data?.detail || `Request failed: ${response.status}`
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
