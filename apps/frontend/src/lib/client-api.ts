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
  const response = await fetch(`/api/backend${path}`, {
    method: options.method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
