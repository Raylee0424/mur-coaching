import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { CALL_LIMITS, CALL_MINUTES, CallKind, openSlots, validateAvailability } from '@coaching/shared';
import type { AvailabilityDto, AvailabilityWindow, BookingDto, ClientCallsDto, CoachScheduleDto, SaveAvailabilityRequest, SlotDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES, isAccessibleLink } from '../clients/link-status';

const MINUTE_MS = 60_000;
const COACH_SLOT_DAYS = 7;

const bookingInclude = { client: { select: { name: true, displayName: true } } } satisfies Prisma.BookingInclude;
type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

const toBooking = (b: BookingRow): BookingDto => ({
  id: b.id,
  clientId: b.clientId,
  clientName: b.client.displayName ?? b.client.name,
  kind: b.kind,
  startsAt: b.startsAt.toISOString(),
  endsAt: b.endsAt.toISOString(),
  status: b.status,
  agenda: b.agenda,
  meetingUrl: b.meetingUrl,
  bookedByClient: b.bookedById === b.clientId,
});

function toAvailability(row: { timezone: string; windows: Prisma.JsonValue; meetingUrl: string | null } | null): AvailabilityDto | null {
  return row && { timezone: row.timezone, windows: row.windows as unknown as AvailabilityWindow[], meetingUrl: row.meetingUrl };
}

function parseInstant(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('startsAt is not a valid time.');
  return d;
}

/** Who is acting: the client may only pick open slots; the coach may book any future time that is free. */
export type Actor = { role: 'coach'; coachId: string } | { role: 'client'; clientId: string; coachId: string };

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  private busy(coachId: string, exceptId?: string) {
    return this.prisma.booking.findMany({
      where: { coachId, status: BookingStatus.CONFIRMED, endsAt: { gt: new Date() }, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { startsAt: true, endsAt: true },
    }).then((rows) => rows.map((r) => ({ startsAt: r.startsAt.toISOString(), endsAt: r.endsAt.toISOString() })));
  }

  private upcoming(where: Prisma.BookingWhereInput) {
    return this.prisma.booking.findMany({
      where: { ...where, status: BookingStatus.CONFIRMED, endsAt: { gt: new Date() } },
      include: bookingInclude,
      orderBy: { startsAt: 'asc' },
    });
  }

  // ─── Coach ───

  async coachSchedule(coachId: string): Promise<CoachScheduleDto> {
    const [row, upcoming, links] = await Promise.all([
      this.prisma.availability.findUnique({ where: { coachId } }),
      this.upcoming({ coachId }),
      this.prisma.coachClient.findMany({
        where: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } },
        select: { client: { select: { id: true, name: true, displayName: true } } },
      }),
    ]);
    const availability = toAvailability(row);
    const busy = upcoming.map((b) => ({ startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString() }));
    return {
      availability,
      upcoming: upcoming.map(toBooking),
      openSlots: availability ? openSlots(availability, busy, { now: Date.now(), days: COACH_SLOT_DAYS, minutes: CALL_MINUTES.CHECK_IN, noticeMinutes: 0 }) : [],
      clients: links.map(({ client }) => ({ id: client.id, name: client.displayName ?? client.name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  async saveAvailability(coachId: string, input: SaveAvailabilityRequest): Promise<AvailabilityDto> {
    const problem = validateAvailability(input);
    if (problem) throw new BadRequestException(problem);
    const windows = [...input.windows]
      .sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute)
      .map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute }));
    const data = { timezone: input.timezone, windows, meetingUrl: input.meetingUrl || null };
    const row = await this.prisma.availability.upsert({ where: { coachId }, create: { coachId, ...data }, update: data });
    return toAvailability(row)!;
  }

  private async assertRoster(coachId: string, clientId: string): Promise<void> {
    const link = await this.prisma.coachClient.findFirst({ where: { coachId, clientId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } }, select: { id: true } });
    if (!link) throw new NotFoundException('Client not found');
  }

  // ─── Client ───

  private async clientCoach(clientId: string): Promise<{ coachId: string; coachName: string } | null> {
    const link = await this.prisma.coachClient.findUnique({ where: { clientId }, select: { coachId: true, status: true, coach: { select: { name: true, displayName: true } } } });
    return link && isAccessibleLink(link.status) ? { coachId: link.coachId, coachName: link.coach.displayName ?? link.coach.name } : null;
  }

  async clientCalls(clientId: string): Promise<ClientCallsDto> {
    const coach = await this.clientCoach(clientId);
    const empty = { [CallKind.CHECK_IN]: [], [CallKind.ONBOARDING]: [] } as Record<CallKind, SlotDto[]>;
    if (!coach) return { coachName: null, timezone: null, upcoming: [], slots: empty };
    const [row, upcoming, busy] = await Promise.all([
      this.prisma.availability.findUnique({ where: { coachId: coach.coachId } }),
      this.upcoming({ coachId: coach.coachId, clientId }),
      this.busy(coach.coachId),
    ]);
    const availability = toAvailability(row);
    const slots = (kind: CallKind): SlotDto[] =>
      availability ? openSlots(availability, busy, { now: Date.now(), days: CALL_LIMITS.horizonDays, minutes: CALL_MINUTES[kind] }) : [];
    return {
      coachName: coach.coachName,
      timezone: availability?.timezone ?? null,
      upcoming: upcoming.map(toBooking),
      slots: { [CallKind.CHECK_IN]: slots(CallKind.CHECK_IN), [CallKind.ONBOARDING]: slots(CallKind.ONBOARDING) },
    };
  }

  // ─── Booking writes (both sides) ───

  /**
   * Serializes writes per coach with a transaction-scoped advisory lock, then re-checks overlap, so two people
   * racing for one slot cannot both win.
   */
  private async lockedWrite<T>(coachId: string, write: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking:${coachId}`}))`;
      return write(tx);
    });
  }

  private async assertFree(tx: Prisma.TransactionClient, coachId: string, startsAt: Date, endsAt: Date, exceptId?: string): Promise<void> {
    const clash = await tx.booking.findFirst({
      where: { coachId, status: BookingStatus.CONFIRMED, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    if (clash) throw new ConflictException('That time was just taken. Pick another slot.');
  }

  /** Client times must be one of the open slots (window, grid, notice, horizon); coach times only need to be future. */
  private async assertAllowedTime(actor: Actor, kind: CallKind, startsAt: Date, exceptId?: string): Promise<void> {
    if (actor.role === 'coach') {
      if (startsAt.getTime() <= Date.now()) throw new BadRequestException('Pick a time in the future.');
      return;
    }
    const row = await this.prisma.availability.findUnique({ where: { coachId: actor.coachId } });
    const availability = toAvailability(row);
    if (!availability) throw new BadRequestException('Your coach has not opened any call times yet.');
    const slots = openSlots(availability, await this.busy(actor.coachId, exceptId), { now: Date.now(), days: CALL_LIMITS.horizonDays, minutes: CALL_MINUTES[kind] });
    if (!slots.some((s) => s.startsAt === startsAt.toISOString())) throw new BadRequestException('That time is not open. Pick one of the listed slots.');
  }

  async book(actor: Actor, input: { kind: CallKind; startsAt: string; agenda?: string | null; clientId: string }): Promise<BookingDto> {
    const startsAt = parseInstant(input.startsAt);
    const endsAt = new Date(startsAt.getTime() + CALL_MINUTES[input.kind] * MINUTE_MS);
    await this.assertAllowedTime(actor, input.kind, startsAt);
    const defaults = await this.prisma.availability.findUnique({ where: { coachId: actor.coachId }, select: { meetingUrl: true } });
    const row = await this.lockedWrite(actor.coachId, async (tx) => {
      if (actor.role === 'client') {
        const held = await tx.booking.count({ where: { clientId: input.clientId, status: BookingStatus.CONFIRMED, endsAt: { gt: new Date() } } });
        if (held >= CALL_LIMITS.maxUpcomingPerClient) throw new ConflictException(`You can hold ${CALL_LIMITS.maxUpcomingPerClient} upcoming calls at once.`);
      }
      await this.assertFree(tx, actor.coachId, startsAt, endsAt);
      return tx.booking.create({
        data: {
          coachId: actor.coachId,
          clientId: input.clientId,
          kind: input.kind,
          startsAt,
          endsAt,
          agenda: input.agenda || null,
          meetingUrl: defaults?.meetingUrl ?? null,
          bookedById: actor.role === 'coach' ? actor.coachId : actor.clientId,
        },
        include: bookingInclude,
      });
    });
    return toBooking(row);
  }

  async coachBook(coachId: string, input: { kind: CallKind; startsAt: string; agenda?: string | null; clientId?: string }): Promise<BookingDto> {
    if (!input.clientId) throw new BadRequestException('Pick a client.');
    await this.assertRoster(coachId, input.clientId);
    return this.book({ role: 'coach', coachId }, { ...input, clientId: input.clientId });
  }

  async clientBook(clientId: string, input: { kind: CallKind; startsAt: string; agenda?: string | null }): Promise<BookingDto> {
    const coach = await this.clientCoach(clientId);
    if (!coach) throw new BadRequestException('You need an active coach to book a call.');
    return this.book({ role: 'client', clientId, coachId: coach.coachId }, { ...input, clientId });
  }

  /** The booking must be the actor's, confirmed and not yet over; else 404. */
  private async findOpen(actor: Actor, id: string) {
    const where = actor.role === 'coach' ? { id, coachId: actor.coachId } : { id, clientId: actor.clientId, coachId: actor.coachId };
    const b = await this.prisma.booking.findFirst({ where: { ...where, status: BookingStatus.CONFIRMED, endsAt: { gt: new Date() } } });
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  async update(actor: Actor, id: string, input: { startsAt?: string; agenda?: string | null; meetingUrl?: string | null }): Promise<BookingDto> {
    const b = await this.findOpen(actor, id);
    if (input.meetingUrl && !/^https:\/\/\S+$/.test(input.meetingUrl)) throw new BadRequestException('The meeting link must start with https://.');
    const startsAt = input.startsAt ? parseInstant(input.startsAt) : null;
    if (startsAt) await this.assertAllowedTime(actor, b.kind, startsAt, b.id);
    const row = await this.lockedWrite(actor.coachId, async (tx) => {
      let times = {};
      if (startsAt) {
        const endsAt = new Date(startsAt.getTime() + CALL_MINUTES[b.kind] * MINUTE_MS);
        await this.assertFree(tx, actor.coachId, startsAt, endsAt, b.id);
        times = { startsAt, endsAt };
      }
      return tx.booking.update({
        where: { id: b.id },
        data: {
          ...times,
          ...(actor.role === 'coach' && input.agenda !== undefined ? { agenda: input.agenda } : {}),
          ...(actor.role === 'coach' && input.meetingUrl !== undefined ? { meetingUrl: input.meetingUrl } : {}),
        },
        include: bookingInclude,
      });
    });
    return toBooking(row);
  }

  async cancel(actor: Actor, id: string): Promise<void> {
    const b = await this.findOpen(actor, id);
    await this.prisma.booking.update({ where: { id: b.id }, data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() } });
  }

  coachActor(coachId: string): Actor {
    return { role: 'coach', coachId };
  }

  async clientActor(clientId: string): Promise<Actor> {
    const coach = await this.clientCoach(clientId);
    if (!coach) throw new NotFoundException('Booking not found');
    return { role: 'client', clientId, coachId: coach.coachId };
  }
}
