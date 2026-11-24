import { isIP } from 'node:net';

/**
 * The visitor IP to hand the API for per-IP rate limits, or null.
 *
 * Only `headerName` is read: a single-value header that the edge proxy in front of this server sets and
 * overwrites (for example `cf-connecting-ip`, `fly-client-ip`, or `x-real-ip` from your own nginx).
 * `x-forwarded-for` is never used: Next passes a browser-supplied value through untouched, so trusting it
 * would let anyone pick a fresh IP per request. A list or anything that is not one IP is rejected.
 */
export function trustedClientIp(get: (name: string) => string | null, headerName: string | undefined): string | null {
  const name = headerName?.trim().toLowerCase();
  if (!name || name === 'x-forwarded-for') return null;
  const value = get(name)?.trim();
  return value && isIP(value) !== 0 ? value : null;
}
