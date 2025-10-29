import { queryClient } from "./queryClient";

export interface User {
  id: string;
  phone: string;
  role: "admin" | "agent" | "farmer";
  name: string;
}

async function apiRequest<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    let errorMessage = res.statusText;
    try {
      const json = JSON.parse(text);
      errorMessage = json.error || json.message || errorMessage;
    } catch {
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function login(phone: string, password: string): Promise<User> {
  const response = await apiRequest<{ user: User }>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  return response.user;
}

export async function register(data: {
  phone: string;
  password: string;
  role: "admin" | "agent" | "farmer";
  name: string;
}): Promise<User> {
  const response = await apiRequest<{ user: User }>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.user;
}

export async function logout(): Promise<void> {
  await apiRequest("/api/auth/logout", {
    method: "POST",
  });
  queryClient.clear();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiRequest<{ user: User }>("/api/auth/me");
    return response.user;
  } catch (error) {
    return null;
  }
}
