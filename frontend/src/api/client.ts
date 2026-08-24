// Empty by default so every request is relative (e.g. `/api/...`) and resolves against
// whatever origin served the page — the frontend's nginx (see nginx.conf) proxies `/api/`
// to the backend container, and the Vite dev server does the same (see vite.config.ts).
// This is what lets the same built image work behind any domain without a rebuild.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

let authToken: string | null = null;
let currentWorldId: number | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function setCurrentWorldId(worldId: number | null): void {
  currentWorldId = worldId;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export function apiHeaders(includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeContentType) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  if (currentWorldId !== null) headers["X-World-Id"] = String(currentWorldId);
  return headers;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...apiHeaders(), ...options?.headers },
  });

  if (response.status === 401) {
    const body = await response.text();
    onUnauthorized?.();
    throw new Error(`API error 401: ${body}`);
  }

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
