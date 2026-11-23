import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Limitation, Prisma } from '@prisma/client';
import { LimitationTarget } from '@coaching/shared';
import type { LimitationDto, LimitationFlag, MuscleGroup } from '@coaching/shared';
import type { RequestUser } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientAccessService } from '../clients/client-access.service';
import { limitationFlag, type LimitationRow } from './conflict';
import type { CreateLimitationDto, UpdateLimitationDto } from './dto/limitations.dto';

const dayOf = (d: Date): string => d.toISOString().slice(0, 10);
const asDate = (day: string): Date => {
  const d = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || dayOf(d) !== day) throw new BadRequestException(`Invalid date: ${day}`);
  return d;
};

type WithExercise = Limitation & { exercise: { name: string } | null };

const toRow = (l: Limitation): LimitationRow => ({
  id: l.id,
  target: l.target,
  muscleGroup: l.muscleGroup,
  exerciseId: l.exerciseId,
  severity: l.severity,
  note: l.note,
  startsOn: dayOf(l.startsOn),
  endsOn: l.endsOn ? dayOf(l.endsOn) : null,
});

const toDto = (l: WithExercise): LimitationDto => ({
  ...toRow(l),
  clientId: l.clientId,
  exerciseName: l.exercise?.name ?? null,
  createdAt: l.createdAt.toISOString(),
});

/** A client's injuries and limitations. Every method goes through the tenancy check. Advisory data: nothing here blocks logging. */
@Injectable()
export class LimitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClientAccessService,
  ) {}

  async list(user: RequestUser, clientId: string, onlyActive = false, today = dayOf(new Date())): Promise<LimitationDto[]> {
    await this.access.assertCanAccessClient(user, clientId);
    const rows = await this.prisma.limitation.findMany({
      where: { clientId },
      orderBy: [{ startsOn: 'desc' }, { createdAt: 'desc' }],
      include: { exercise: { select: { name: true } } },
    });
    const dtos = rows.map(toDto);
    return onlyActive ? dtos.filter((l) => l.startsOn <= today && (l.endsOn === null || l.endsOn >= today)) : dtos;
  }

  async create(user: RequestUser, clientId: string, dto: CreateLimitationDto, today = dayOf(new Date())): Promise<LimitationDto> {
    await this.access.assertCanAccessClient(user, clientId);
    const startsOn = dto.startsOn ?? today;
    this.assertRange(startsOn, dto.endsOn ?? null);

    if (dto.target === LimitationTarget.EXERCISE) {
      await this.assertExerciseVisible(clientId, dto.exerciseId as string);
    }
    const row = await this.prisma.limitation.create({
      data: {
        clientId,
        target: dto.target,
        muscleGroup: dto.target === LimitationTarget.MUSCLE ? (dto.muscleGroup as MuscleGroup) : null,
        exerciseId: dto.target === LimitationTarget.EXERCISE ? (dto.exerciseId as string) : null,
        severity: dto.severity,
        note: dto.note || null,
        startsOn: asDate(startsOn),
        endsOn: dto.endsOn ? asDate(dto.endsOn) : null,
      },
      include: { exercise: { select: { name: true } } },
    });
    return toDto(row);
  }

  async update(user: RequestUser, clientId: string, id: string, dto: UpdateLimitationDto): Promise<LimitationDto> {
    await this.access.assertCanAccessClient(user, clientId);
    const existing = await this.findOwned(clientId, id);
    const startsOn = dto.startsOn ?? dayOf(existing.startsOn);
    const endsOn = dto.endsOn !== undefined ? dto.endsOn : existing.endsOn ? dayOf(existing.endsOn) : null;
    this.assertRange(startsOn, endsOn);

    const data: Prisma.LimitationUpdateInput = {
      ...(dto.severity ? { severity: dto.severity } : {}),
      ...(dto.note !== undefined ? { note: dto.note || null } : {}),
      startsOn: asDate(startsOn),
      endsOn: endsOn ? asDate(endsOn) : null,
    };
    const row = await this.prisma.limitation.update({ where: { id }, data, include: { exercise: { select: { name: true } } } });
    return toDto(row);
  }

  async remove(user: RequestUser, clientId: string, id: string): Promise<void> {
    await this.access.assertCanAccessClient(user, clientId);
    await this.findOwned(clientId, id);
    await this.prisma.limitation.delete({ where: { id } });
  }

  /** Rows for conflict checks. Not tenancy-checked: callers pass a client id they already authorised (own id or access-checked). */
  async activeRows(clientId: string, day: string): Promise<LimitationRow[]> {
    const rows = await this.prisma.limitation.findMany({
      where: { clientId, startsOn: { lte: asDate(day) }, OR: [{ endsOn: null }, { endsOn: { gte: asDate(day) } }] },
    });
    return rows.map(toRow);
  }

  /** One flag (or null) per exercise id. */
  async flagsFor(clientId: string, exercises: readonly { id: string; muscleGroup: MuscleGroup }[], day: string): Promise<Map<string, LimitationFlag | null>> {
    const rows = await this.activeRows(clientId, day);
    return new Map(exercises.map((e) => [e.id, limitationFlag(rows, e, day)]));
  }

  private assertRange(startsOn: string, endsOn: string | null): void {
    asDate(startsOn);
    if (endsOn !== null && asDate(endsOn) < asDate(startsOn)) throw new BadRequestException('End date must be on or after the start date');
  }

  private async findOwned(clientId: string, id: string): Promise<Limitation> {
    const row = await this.prisma.limitation.findFirst({ where: { id, clientId } });
    if (!row) throw new NotFoundException('Limitation not found');
    return row;
  }

  /** Global exercises, or those owned by the client's coach. */
  private async assertExerciseVisible(clientId: string, exerciseId: string): Promise<void> {
    const link = await this.prisma.coachClient.findUnique({ where: { clientId }, select: { coachId: true } });
    const ok = await this.prisma.exercise.findFirst({
      where: { id: exerciseId, OR: [{ coachId: null }, ...(link ? [{ coachId: link.coachId }] : [])] },
      select: { id: true },
    });
    if (!ok) throw new BadRequestException('Unknown exercise');
  }
}
