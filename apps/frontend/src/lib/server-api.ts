import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const apiBaseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
const loginPath = "/login?session=expired";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

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
    redirect("/login");
  }

  try {
    return await backendRequest<T>(path, token);
  } catch (error) {
    if (isMissingSessionContext(error)) {
      redirect(loginPath);
    }

    throw error;
  }
}

export async function hasWorkspaceSession() {
  const token = await requireAuthToken();
  if (!token) {
    return false;
  }

  try {
    await backendRequest("/api/workspace", token);
    return true;
  } catch (error) {
    if (isMissingSessionContext(error)) {
      return false;
    }

    throw error;
  }
}

export async function backendRequest<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("API_URL or NEXT_PUBLIC_API_URL is not configured");
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

  const payload = (await parsePayload(response)) as {
    success?: boolean;
    data?: T;
    error?: string;
  };

  if (!response.ok || payload.success === false) {
    throw new ApiRequestError(payload.error ?? "API request failed", response.status);
  }

  return (payload.data ?? payload) as T;
}

function isMissingSessionContext(error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return false;
  }

  return (
    error.status === 401 ||
    error.message === "Workspace context is missing" ||
    (error.status === 503 && error.message.toLowerCase().includes("workspace context"))
  );
}

async function parsePayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { success: false, error: text };
  }
}
