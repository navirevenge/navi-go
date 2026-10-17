import type { AuthResponse, Dashboard, Lesson, StudySession, User } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const TOKEN_KEY = "navigo.token";

export class ApiError extends Error {
  constructor(public status: number, message: string, public fieldErrors?: Record<string, string>) {
    super(message);
  }
}

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? res.statusText, body?.fieldErrors ?? undefined);
  }
  return (await res.json()) as T;
}

export const api = {
  register: (b: { email: string; password: string; displayName: string; currentLevel: string }) =>
    request<AuthResponse>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(b) }),
  login: (b: { email: string; password: string }) =>
    request<AuthResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(b) }),
  me: () => request<User>("/api/v1/auth/me"),
  dashboard: () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return request<Dashboard>(`/api/v1/dashboard?timezone=${encodeURIComponent(tz)}`);
  },
  lessons: () => request<Lesson[]>("/api/v1/lessons"),
  startSession: (lessonId: string | null) =>
    request<StudySession>("/api/v1/study-sessions", { method: "POST", body: JSON.stringify({ lessonId }) }),
  completeSession: (id: string, durationMinutes: number) =>
    request<StudySession>(`/api/v1/study-sessions/${id}/complete`, { method: "POST", body: JSON.stringify({ durationMinutes }) }),
};
