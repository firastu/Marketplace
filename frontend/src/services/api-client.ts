// Where the browser sends REST calls. By default straight to the backend
// (the same origin images and the chat socket already use). "/api" routes
// them through the Next.js proxy instead, which is handy for LAN testing
// but hides the client's IP from the backend: all guests then share one
// rate-limit bucket. See frontend/.env.example.
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const API_URL = process.env.NEXT_PUBLIC_API_URL || `${BACKEND_URL}/api`;

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
 * logged in any more" (401) apart from a flaky connection (0) or a server
 * error. `message` is the server's English text: never show it directly,
 * translate it with useErrorText() from '@/i18n/errors'.
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

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, fetchOptions);
  } catch {
    // The request never reached the server: offline, DNS, connection reset.
    throw new ApiError('Network error', 0);
  }

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

/**
 * multipart POST with upload progress. fetch() cannot report how much of a
 * request body has been sent, XMLHttpRequest can; on a slow connection a
 * 3 MB photo without a progress bar looks like a frozen page.
 */
export function uploadWithProgress<T>(
  endpoint: string,
  body: FormData,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${endpoint}`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        // not JSON: handled below by status
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as T);
        return;
      }
      if (xhr.status === 401 && token) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      reject(new ApiError(errorMessage(payload, xhr.status), xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('Network error', 0));
    xhr.onabort = () => reject(new ApiError('Upload cancelled', 0));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(body);
  });
}
