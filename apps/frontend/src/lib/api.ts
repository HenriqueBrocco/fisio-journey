import { getToken } from "./storage";

const API_BASE = import.meta.env.VITE_API_URL || "";

type ApiOptions = RequestInit & { auth?: boolean };

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const auth = options.auth ?? true;

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  // Se você mandar JSON, configure o header e stringify o body no caller.
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  // pode retornar 204 em alguns endpoints; aqui assume JSON sempre
  return res.json();
}