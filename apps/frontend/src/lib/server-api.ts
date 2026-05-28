import { cookies } from "next/headers";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

export async function requireAuthToken() {
  const token = (await cookies()).get("yetrix_token")?.value;
  if (!token) {
    return null;
  }
  return token;
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = await requireAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  return backendRequest<T>(path, token);
}

export async function backendRequest<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  const payload = (await response.json()) as {
    success?: boolean;
    data?: T;
    error?: string;
  };

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error ?? "API request failed");
  }

  return (payload.data ?? payload) as T;
}
