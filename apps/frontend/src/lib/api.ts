const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  if (!apiBaseUrl) {
    return fallback;
  }

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      next: { revalidate: 30 },
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}
