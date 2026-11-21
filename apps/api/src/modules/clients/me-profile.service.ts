import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MeProfileDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClientProfileInputDto } from './dto/client-settings.dto';
import type { BaselineInputDto } from './dto/me-profile.dto';
import { isAccessibleLink } from './link-status';

const PROFILE_KEYS = [
  'goals',
  'goalNote',
  'experience',
  'daysPerWeek',
  'trainingDays',
  'sessionLengthMin',
  'limitations',
  'limitationsNote',
] as const;

/** The signed-in client's own onboarding answers and starting weights. */
@Injectable()
export class MeProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(clientId: string): Promise<MeProfileDto> {
    const [p, baselines] = await Promise.all([
      this.prisma.clientProfile.findUnique({ where: { clientId } }),
      this.prisma.clientBaseline.findMany({
        where: { clientId },
        include: { exercise: { select: { name: true } } },
        orderBy: { exercise: { name: 'asc' } },
      }),
    ]);
    return {
      profile: {
        goals: p?.goals ?? [],
        goalNote: p?.goalNote ?? null,
        experience: p?.experience ?? null,
        daysPerWeek: p?.daysPerWeek ?? null,
        trainingDays: p?.trainingDays ?? [],
        sessionLengthMin: p?.sessionLengthMin ?? null,
        limitations: p?.limitations ?? [],
        limitationsNote: p?.limitationsNote ?? null,
      },
      baselines: baselines.map((b) => ({
        exerciseId: b.exerciseId,
        exerciseName: b.exercise.name,
        weightKg: b.weightKg?.toNumber() ?? null,
        reps: b.reps,
        unknown: b.unknown,
      })),
    };
  }

  async updateProfile(clientId: string, dto: ClientProfileInputDto): Promise<MeProfileDto> {
    const data = Object.fromEntries(
      PROFILE_KEYS.filter((k) => dto[k] !== undefined).map((k) => [k, dto[k] === '' ? null : dto[k]]),
    ) as Prisma.ClientProfileUncheckedUpdateInput;
    await this.prisma.clientProfile.upsert({
      where: { clientId },
      create: { ...(data as Prisma.ClientProfileUncheckedCreateInput), clientId },
      update: data,
    });
    return this.get(clientId);
  }

  /** Upserts the submitted lifts. Exercises must be in this client's library (global or their coach's). */
  async setBaselines(clientId: string, rows: BaselineInputDto[]): Promise<MeProfileDto> {
    const ids = [...new Set(rows.map((r) => r.exerciseId))];
    if (ids.length !== rows.length) throw new BadRequestException('Each exercise once');
    for (const r of rows) {
      if (!r.unknown && (r.weightKg === null || r.weightKg === undefined)) {
        throw new BadRequestException('Enter a weight or mark it as unknown');
      }
    }
    const link = await this.prisma.coachClient.findUnique({ where: { clientId } });
    const coachId = link && isAccessibleLink(link.status) ? link.coachId : null;
    const visible = await this.prisma.exercise.count({
      where: { id: { in: ids }, OR: [{ coachId: null }, ...(coachId ? [{ coachId }] : [])] },
    });
    if (visible !== ids.length) throw new BadRequestException('Unknown exercise');

    await this.prisma.$transaction(
      rows.map((r) => {
        const data = { weightKg: r.unknown ? null : r.weightKg, reps: r.unknown ? null : (r.reps ?? null), unknown: r.unknown };
        return this.prisma.clientBaseline.upsert({
          where: { clientId_exerciseId: { clientId, exerciseId: r.exerciseId } },
          create: { clientId, exerciseId: r.exerciseId, ...data },
          update: data,
        });
      }),
    );
    return this.get(clientId);
  }
}
