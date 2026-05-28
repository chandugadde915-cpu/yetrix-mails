const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body,
  });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PUT",
    body,
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, {
    method: "DELETE",
  });
}

async function apiRequest<T>(
  path: string,
  options: { method: "POST" | "PUT" | "DELETE"; body?: unknown },
): Promise<T> {
  if (!publicApiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`/api/backend${path}`, {
    method: options.method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await parsePayload(response)) as {
    success?: boolean;
    data?: T;
    error?: string;
  };

  const missingSession =
    response.status === 401 ||
    (typeof payload.error === "string" &&
      ((response.status === 503 && payload.error.toLowerCase().includes("workspace context")) ||
        (response.status === 403 && payload.error.toLowerCase().includes("workspace setup"))));

  if (missingSession && typeof window !== "undefined") {
    const target = response.status === 401 ? "/login?session=expired" : "/workspace-setup";
    window.location.assign(target);
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error ?? "API request failed");
  }

  return (payload.data ?? payload) as T;
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
