import { ApiError, apiErrorKind } from "./errors";

type ApiRequestOptions = RequestInit & { timeoutMs?: number };

export const apiRequest = async <T>(
  path: string,
  { timeoutMs = 15_000, ...options }: ApiRequestOptions = {},
): Promise<T> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: "include",
      signal: options.signal ?? controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(
        "The request could not be completed.",
        response.status,
        apiErrorKind(response.status),
        response.headers.get("x-request-id") ?? undefined,
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};
