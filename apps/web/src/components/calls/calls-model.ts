import { zonedToUtc } from '@coaching/shared';
import type { SlotDto } from '@coaching/shared';

/** `Mon, Nov 23` in `timeZone`. */
export function dayLabel(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone });
}

/** `14:30` in `timeZone`. */
export function timeLabel(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone });
}

/** Short zone name such as `PST` or `GMT+9`. */
export function zoneLabel(timeZone: string, at: number = Date.now()): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(new Date(at)).find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
}

/** YYYY-MM-DD of an instant in `timeZone`. */
export function dateKey(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone });
}

/** Slots grouped by their local day in `timeZone`, in order. */
export function groupByDay<T extends Pick<SlotDto, 'startsAt'>>(items: readonly T[], timeZone: string): { date: string; label: string; items: T[] }[] {
  const groups = new Map<string, { date: string; label: string; items: T[] }>();
  for (const it of items) {
    const date = dateKey(it.startsAt, timeZone);
    const g = groups.get(date) ?? { date, label: dayLabel(it.startsAt, timeZone), items: [] };
    g.items.push(it);
    groups.set(date, g);
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** `HH:MM` (from an `<input type="time">`) to minutes after midnight, or null. */
export function parseClock(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return minutes <= 1440 ? minutes : null;
}

/** Date + time typed in `timeZone` to an ISO instant, whatever zone the browser is in. */
export function zonedInputToIso(date: string, time: string, timeZone: string): string | null {
  const minute = parseClock(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || minute === null) return null;
  return zonedToUtc(date, minute, timeZone).toISOString();
}

export function timeZones(): string[] {
  const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone');
  return list?.length ? list : ['UTC'];
}
