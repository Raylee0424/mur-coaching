import 'server-only';

function readApiUrl(): string {
  const value = process.env.API_URL;
  if (!value) {
    throw new Error('API_URL is not set. Copy apps/web/.env.local.example to apps/web/.env.local.');
  }
  return value.replace(/\/+$/, '');
}

export const API_URL = readApiUrl();

/**
 * Single-IP header your edge proxy sets and overwrites (e.g. cf-connecting-ip). Unset: no visitor IP is sent, and
 * the API rate-limits by this server's address (fine locally, too coarse in production).
 */
export const CLIENT_IP_HEADER = process.env.CLIENT_IP_HEADER || undefined;

/** Public API origin shown to athletes for AI connectors (outside apps call it, never the browser). Defaults to API_URL. */
export const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || API_URL).replace(/\/+$/, '');
