import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const loginPath = "/login?session=expired";
const workspaceSetupPath = "/workspace-setup";

export interface SafeApiResult<T> {
  data: T;
  error?: string;
  status?: number;
}

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

export async function requirePageSession() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = await requireAuthToken();
  if (!token) {
    redirect("/login");
  }

  try {
    return await backendRequest<T>(path, token);
  } catch (error) {
    if (isAuthError(error)) {
      redirect(loginPath);
    }

    if (isMissingWorkspaceContext(error)) {
      redirect(workspaceSetupPath);
    }

    throw error;
  }
}

export async function apiGetSafe<T>(path: string, fallback: T): Promise<SafeApiResult<T>> {
  const token = await requireAuthToken();
  if (!token) {
    redirect("/login");
  }

  try {
    return {
      data: await backendRequest<T>(path, token),
    };
  } catch (error) {
    if (isAuthError(error)) {
      redirect(loginPath);
    }

    if (isMissingWorkspaceContext(error)) {
      redirect(workspaceSetupPath);
    }

    if (error instanceof ApiRequestError) {
      return {
        data: fallback,
        error: publicErrorMessage(error.message),
        status: error.status,
      };
    }

    return {
      data: fallback,
      error: error instanceof Error ? publicErrorMessage(error.message) : "Workspace request failed",
    };
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
    if (isAuthError(error) || isMissingWorkspaceContext(error)) {
      return false;
    }

    throw error;
  }
}

export async function backendRequest<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getServerApiBaseUrl()}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new ApiRequestError(
      error instanceof Error
        ? `Workspace service is unreachable: ${error.message}`
        : "Workspace service is unreachable",
      502,
    );
  }

  const payload = (await parsePayload(response)) as {
    success?: boolean;
    data?: T;
    error?: string;
  };

  if (!response.ok || payload.success === false) {
    throw new ApiRequestError(publicErrorMessage(payload.error), response.status);
  }

  return (payload.data ?? payload) as T;
}

function getServerApiBaseUrl() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new ApiRequestError("Workspace connection is not configured", 500);
  }

  return apiUrl.replace(/\/$/, "");
}

function isAuthError(error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return false;
  }

  return error.status === 401;
}

function isMissingWorkspaceContext(error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    (error.status === 503 && message.includes("workspace context")) ||
    (error.status === 403 && message.includes("workspace setup"))
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

export function publicErrorMessage(message?: string) {
  if (!message) {
    return "Workspace request failed";
  }

  if (/(^|[^a-z])api([^a-z]|$)|backend|mailcow|mail_engine|mail engine|smtp|imap|cors|econn|enotfound|socket|tls|fetch|localhost|port\s+\d+/i.test(message)) {
    return "Workspace service is temporarily unavailable.";
  }

  return message;
}
