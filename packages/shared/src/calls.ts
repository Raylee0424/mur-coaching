import type { IsoDateString } from './common';

export const CallKind = { CHECK_IN: 'CHECK_IN', ONBOARDING: 'ONBOARDING' } as const;
export type CallKind = (typeof CallKind)[keyof typeof CallKind];
export const CALL_MINUTES: Record<CallKind, number> = { CHECK_IN: 20, ONBOARDING: 30 };
export const CALL_KIND_LABELS: Record<CallKind, string> = { CHECK_IN: '20-min check-in', ONBOARDING: '30-min onboarding' };

export const BookingStatus = { CONFIRMED: 'CONFIRMED', CANCELLED: 'CANCELLED' } as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const CALL_LIMITS = {
  maxWindows: 28,
  /** Slots start on this grid inside a window. */
  slotStepMinutes: 30,
  /** Clients book this many days ahead at most. */
  horizonDays: 21,
  /** Clients cannot book or move a call closer than this to now. */
  minNoticeMinutes: 120,
  /** Upcoming confirmed calls one client may hold. */
  maxUpcomingPerClient: 3,
  maxAgenda: 300,
  maxUrl: 500,
} as const;

export interface AvailabilityWindow {
  /** 0 = Sunday. */
  weekday: number;
  /** Minutes after local midnight. */
  startMinute: number;
  endMinute: number;
}

export interface AvailabilityDto {
  timezone: string;
  windows: AvailabilityWindow[];
  meetingUrl: string | null;
}

export type SaveAvailabilityRequest = AvailabilityDto;

export interface SlotDto {
  startsAt: IsoDateString;
  endsAt: IsoDateString;
}

export interface BookingDto {
  id: string;
  clientId: string;
  clientName: string;
  kind: CallKind;
  startsAt: IsoDateString;
  endsAt: IsoDateString;
  status: BookingStatus;
  agenda: string | null;
  meetingUrl: string | null;
  bookedByClient: boolean;
}

export interface CoachScheduleDto {
  availability: AvailabilityDto | null;
  upcoming: BookingDto[];
  /** Open 20-minute slots over the next 7 days. */
  openSlots: SlotDto[];
  clients: { id: string; name: string }[];
}

export interface ClientCallsDto {
  coachName: string | null;
  /** The coach's timezone; slot times are shown in it as well as the viewer's own. */
  timezone: string | null;
  upcoming: BookingDto[];
  slots: Record<CallKind, SlotDto[]>;
}

export interface CreateBookingRequest {
  kind: CallKind;
  startsAt: IsoDateString;
  agenda?: string | null;
  /** Coach only. */
  clientId?: string;
}

export interface UpdateBookingRequest {
  startsAt?: IsoDateString;
  /** Coach only. */
  agenda?: string | null;
  meetingUrl?: string | null;
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Wall clock of `instant` in `timeZone`. */
function wallClock(instant: number, timeZone: string): { date: string; minute: number; weekday: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, minute: Number(parts.hour) * 60 + Number(parts.minute), weekday: new Date(`${date}T00:00:00Z`).getUTCDay() };
}

/** Today's date (YYYY-MM-DD) in `timeZone`. */
export function zonedToday(timeZone: string, now: number = Date.now()): string {
  return wallClock(now, timeZone).date;
}

/**
 * The UTC instant of local `date` + `minute` in `timeZone`. A repeated wall time (DST fall-back) resolves to its
 * first occurrence. A skipped one (spring-forward gap) has no instant: the result reads as another wall time,
 * which callers that need an exact match (openSlots) drop.
 */
export function zonedToUtc(date: string, minute: number, timeZone: string): Date {
  const naive = Date.parse(`${date}T00:00:00Z`) + minute * MINUTE_MS;
  const offsetAt = (t: number): number => {
    const w = wallClock(t, timeZone);
    return Date.parse(`${w.date}T00:00:00Z`) + w.minute * MINUTE_MS - t;
  };
  let t = naive - offsetAt(naive);
  t = naive - offsetAt(t);
  // Second offset can overshoot backwards on a fall-back day; prefer the earlier of two valid instants.
  const earlier = t - 60 * MINUTE_MS;
  const w = wallClock(earlier, timeZone);
  if (w.date === date && w.minute === minute) t = earlier;
  return new Date(t);
}

export function validateAvailability(input: SaveAvailabilityRequest): string | null {
  if (!isValidTimeZone(input.timezone)) return 'Pick a valid timezone.';
  if (input.windows.length > CALL_LIMITS.maxWindows) return `Use at most ${CALL_LIMITS.maxWindows} windows.`;
  const sorted = [...input.windows].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
  for (const [i, w] of sorted.entries()) {
    if (!Number.isInteger(w.weekday) || w.weekday < 0 || w.weekday > 6) return 'A window has an unknown weekday.';
    if (!Number.isInteger(w.startMinute) || !Number.isInteger(w.endMinute) || w.startMinute < 0 || w.endMinute > 1440) return 'Window times must fall inside one day.';
    if (w.endMinute - w.startMinute < CALL_MINUTES.CHECK_IN) return 'Each window must fit at least one 20-minute call.';
    const prev = sorted[i - 1];
    if (prev && prev.weekday === w.weekday && w.startMinute < prev.endMinute) return 'Windows on the same day overlap.';
  }
  if (input.meetingUrl && !/^https:\/\/\S+$/.test(input.meetingUrl)) return 'The meeting link must start with https://.';
  return null;
}

const overlaps = (aStart: number, aEnd: number, b: { startsAt: string; endsAt: string }): boolean =>
  aStart < Date.parse(b.endsAt) && Date.parse(b.startsAt) < aEnd;

/**
 * Open slots of `minutes` length from now for `days` local days, on the step grid inside each window, at least
 * `noticeMinutes` ahead, and clear of `busy`. Pure: same inputs, same slots.
 */
export function openSlots(
  availability: Pick<AvailabilityDto, 'timezone' | 'windows'>,
  busy: readonly { startsAt: string; endsAt: string }[],
  opts: { now: number; days: number; minutes: number; noticeMinutes?: number },
): SlotDto[] {
  const { timezone, windows } = availability;
  const earliest = opts.now + (opts.noticeMinutes ?? CALL_LIMITS.minNoticeMinutes) * MINUTE_MS;
  const firstDay = Date.parse(`${zonedToday(timezone, opts.now)}T00:00:00Z`);
  const slots: SlotDto[] = [];
  for (let d = 0; d < opts.days; d++) {
    const dayMs = firstDay + d * DAY_MS;
    const date = new Date(dayMs).toISOString().slice(0, 10);
    const weekday = new Date(dayMs).getUTCDay();
    const todays = windows.filter((w) => w.weekday === weekday).sort((a, b) => a.startMinute - b.startMinute);
    for (const w of todays) {
      for (let m = w.startMinute; m + opts.minutes <= w.endMinute; m += CALL_LIMITS.slotStepMinutes) {
        const start = zonedToUtc(date, m, timezone).getTime();
        const end = start + opts.minutes * MINUTE_MS;
        // A DST gap can shift a slot off its wall time; drop it rather than offer a time the coach never set.
        if (wallClock(start, timezone).minute !== m) continue;
        if (start < earliest || busy.some((b) => overlaps(start, end, b))) continue;
        slots.push({ startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() });
      }
    }
  }
  return slots;
}

/** `HH:MM` for minutes after midnight. */
export const formatMinute = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
