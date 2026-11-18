const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  multipart?: boolean;
};

/** Fired on `window` when the server rejects the stored token (401). */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

/**
 * A response with a non-2xx status. `status` lets callers tell "you are not
 * logged in any more" (401) apart from a flaky connection or a server error.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/** NestJS sends `message` as a string, or as a list for validation errors. */
function errorMessage(payload: unknown, status: number): string {
  const message = (payload as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string' && message) return message;
  return `Request failed (HTTP ${status})`;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = false, multipart = false } = options;

  const token = auth ? getToken() : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: multipart
      ? headers
      : { 'Content-Type': 'application/json', ...headers },
    body: multipart
      ? (body as FormData | undefined)
      : body
        ? JSON.stringify(body)
        : undefined,
  };

  const res = await fetch(`${API_URL}${endpoint}`, fetchOptions);

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    if (res.status === 401 && token && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(errorMessage(payload, res.status), res.status);
  }

  // Some endpoints (e.g. DELETE /favorites/:id) answer 200 with no body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
