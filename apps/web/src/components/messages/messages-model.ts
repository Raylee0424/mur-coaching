import type { MessageDto } from '@coaching/shared';

/** How often an open thread asks for new messages (no socket: the browser never talks to the API). */
export const POLL_MS = 5000;

/** Union by id, ordered by time then id (the API's keyset order). */
export function mergeMessages(current: MessageDto[], incoming: MessageDto[]): MessageDto[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/** Index of my latest message: the receipt shows under it only. -1 when I have sent nothing. */
export function lastMineIndex(messages: MessageDto[]): number {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.mine) return i;
  return -1;
}

/** "10:42" today, "Yesterday", or "Nov 21" (viewer's local time). */
export function formatMessageTime(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (at.getTime() >= startOfToday) return at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (at.getTime() >= startOfToday - 86_400_000) return 'Yesterday';
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Day heading key for grouping, in local time. */
export const dayKey = (iso: string): string => new Date(iso).toDateString();
