import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validateRoadmap } from '@coaching/shared';
import type { RoadmapDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { SaveRoadmapDto } from './dto/roadmap.dto';

const roadmapInclude = {
  phases: { orderBy: { position: 'asc' }, include: { program: { select: { name: true } } } },
  goals: { orderBy: { position: 'asc' } },
  events: { orderBy: { date: 'asc' } },
} satisfies Prisma.ClientRoadmapInclude;

const day = (d: Date): string => d.toISOString().slice(0, 10);
const dayOrNull = (d: Date | null): string | null => (d ? day(d) : null);
const asDate = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
const blankToNull = (s: string | null | undefined): string | null => (s && s.trim() ? s.trim() : null);

const toDto = (r: Prisma.ClientRoadmapGetPayload<{ include: typeof roadmapInclude }>): RoadmapDto => ({
  id: r.id,
  clientId: r.clientId,
  title: r.title,
  notes: r.notes,
  startDate: day(r.startDate),
  endDate: day(r.endDate),
  phases: r.phases.map((p) => ({
    id: p.id,
    name: p.name,
    focus: p.focus,
    startDate: day(p.startDate),
    endDate: day(p.endDate),
    programId: p.programId,
    programName: p.program?.name ?? null,
  })),
  goals: r.goals.map((g) => ({
    id: g.id,
    label: g.label,
    unit: g.unit,
    targetValue: g.targetValue.toString(),
    currentValue: g.currentValue?.toString() ?? null,
    dueDate: dayOrNull(g.dueDate),
  })),
  events: r.events.map((e) => ({ id: e.id, name: e.name, date: day(e.date), location: e.location, notes: e.notes })),
  updatedAt: r.updatedAt.toISOString(),
});

/** Callers check coach tenancy (ClientAccessService) before the coach-side methods. */
@Injectable()
export class RoadmapsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(clientId: string): Promise<RoadmapDto | null> {
    const row = await this.prisma.clientRoadmap.findUnique({ where: { clientId }, include: roadmapInclude });
    return row ? toDto(row) : null;
  }

  /** Replaces the whole roadmap (phases, goals, events) in one transaction. */
  async save(coachId: string, clientId: string, input: SaveRoadmapDto): Promise<RoadmapDto> {
    const problem = validateRoadmap(input);
    if (problem) throw new BadRequestException(problem);

    const programIds = [...new Set(input.phases.map((p) => p.programId).filter((id): id is string => Boolean(id)))];
    if (programIds.length > 0) {
      const owned = await this.prisma.program.count({ where: { id: { in: programIds }, coachId } });
      if (owned !== programIds.length) throw new NotFoundException('Program not found');
    }

    const roadmap = await this.prisma.$transaction(async (tx) => {
      const head = { coachId, title: input.title, notes: blankToNull(input.notes), startDate: asDate(input.startDate), endDate: asDate(input.endDate) };
      const row = await tx.clientRoadmap.upsert({ where: { clientId }, create: { clientId, ...head }, update: head, select: { id: true } });
      await Promise.all([
        tx.roadmapPhase.deleteMany({ where: { roadmapId: row.id } }),
        tx.roadmapGoal.deleteMany({ where: { roadmapId: row.id } }),
        tx.clientEvent.deleteMany({ where: { roadmapId: row.id } }),
      ]);
      const ordered = [...input.phases].sort((a, b) => a.startDate.localeCompare(b.startDate));
      await tx.roadmapPhase.createMany({
        data: ordered.map((p, position) => ({
          roadmapId: row.id,
          position,
          name: p.name,
          focus: blankToNull(p.focus),
          startDate: asDate(p.startDate),
          endDate: asDate(p.endDate),
          programId: p.programId || null,
        })),
      });
      await tx.roadmapGoal.createMany({
        data: input.goals.map((g, position) => ({
          roadmapId: row.id,
          position,
          label: g.label,
          unit: g.unit,
          targetValue: g.targetValue,
          currentValue: g.currentValue ? g.currentValue : null,
          dueDate: g.dueDate ? asDate(g.dueDate) : null,
        })),
      });
      await tx.clientEvent.createMany({
        data: input.events.map((e) => ({
          roadmapId: row.id,
          clientId,
          name: e.name,
          date: asDate(e.date),
          location: blankToNull(e.location),
          notes: blankToNull(e.notes),
        })),
      });
      return tx.clientRoadmap.findUniqueOrThrow({ where: { id: row.id }, include: roadmapInclude });
    });
    return toDto(roadmap);
  }

  async remove(clientId: string): Promise<void> {
    const { count } = await this.prisma.clientRoadmap.deleteMany({ where: { clientId } });
    if (count === 0) throw new NotFoundException('Roadmap not found');
  }
}
