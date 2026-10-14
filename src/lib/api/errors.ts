export type ApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "validation"
  | "conflict"
  | "rate-limited"
  | "unknown";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly kind: ApiErrorKind,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}

export const apiErrorKind = (status: number): ApiErrorKind => {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 400 || status === 422) return "validation";
  if (status === 409 || status === 412 || status === 428) return "conflict";
  if (status === 429) return "rate-limited";
  return "unknown";
};
