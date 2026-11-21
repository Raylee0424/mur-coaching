import 'server-only';
import { redirect } from 'next/navigation';
import { API_URL } from '@/lib/env';
import { getSessionToken } from '@/lib/session';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
  ) {
    super(messages.join('; '));
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | undefined>;

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** false for public endpoints (login, demo): no bearer token, and a 401 is a normal error. */
  auth?: boolean;
}

function buildQuery(query: Query | undefined): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Normalizes a Nest error body (`message` is a string or string[]) to string[]. */
function toMessages(body: unknown, fallback: string): string[] {
  if (typeof body === 'object' && body !== null) {
    const { message } = body as { message?: unknown };
    if (typeof message === 'string') return [message];
    if (Array.isArray(message)) {
      const strings = message.filter((m): m is string => typeof m === 'string');
      if (strings.length > 0) return strings;
    }
  }
  return [fallback];
}

/**
 * Server-only typed fetch. Attaches the session cookie as a bearer token.
 * 401 on an authenticated call clears the session via /auth/signout; any other
 * failure throws ApiError. Never cached: every response is per-user.
 */
export async function apiFetch<T>(path: `/${string}`, opts: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = opts;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getSessionToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(503, ['The API is unreachable. Is it running on port 4000?']);
  }

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    if (res.status === 401 && auth) redirect('/auth/signout?reason=expired');
    const errorBody: unknown = await res.json().catch(() => null);
    throw new ApiError(res.status, toMessages(errorBody, res.statusText || 'Request failed'));
  }

  return (await res.json()) as T;
}
