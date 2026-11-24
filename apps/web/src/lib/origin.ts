import 'server-only';
import { headers } from 'next/headers';

/** Origin the visitor reached this server on, for links a coach copies and sends. */
export async function webOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
