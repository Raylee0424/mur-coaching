import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ENGINE_DEFAULTS } from '@coaching/shared';
import type { ClientSettingsDto, ResolvedSetting } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateClientSettingsDto } from './dto/client-settings.dto';

const num = (d: Prisma.Decimal | null): number | null => (d === null ? null : d.toNumber());
const OVERRIDE_KEYS = ['loadIncrementKg', 'rpeCap', 'repsMin', 'repsMax', 'deloadPercent', 'sessionsAnalyzed'] as const;
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

/** Coach-only client settings. Caller has already verified the coach owns this client. */
@Injectable()
export class ClientSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(clientId: string): Promise<ClientSettingsDto> {
    const link = await this.prisma.coachClient.findUnique({
      where: { clientId },
      include: {
        client: { include: { clientProfile: true } },
        coach: { select: { engineRules: true } },
      },
    });
    if (!link) throw new NotFoundException('Client not found');
    const { client } = link;
    const p = client.clientProfile;
    const rules = link.coach.engineRules;
    const inherited = (key: 'rpeCap' | 'deloadPercent' | 'sessionsAnalyzed'): ResolvedSetting<number> => {
      const v = rules?.[key];
      return v === null || v === undefined ? { value: ENGINE_DEFAULTS[key], source: 'DEFAULT' } : { value: Number(v), source: 'COACH' };
    };
    return {
      clientId,
      name: client.name,
      email: client.email,
      status: link.status,
      weightUnit: client.weightUnit,
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
      overrides: {
        loadIncrementKg: num(link.loadIncrementKg),
        rpeCap: num(link.rpeCap),
        repsMin: link.repsMin,
        repsMax: link.repsMax,
        deloadPercent: link.deloadPercent,
        sessionsAnalyzed: link.sessionsAnalyzed,
      },
      autoApprove: link.autoApprove,
      autoApproveMaxKg: num(link.autoApproveMaxKg),
      defaults: {
        rpeCap: inherited('rpeCap'),
        deloadPercent: inherited('deloadPercent'),
        sessionsAnalyzed: inherited('sessionsAnalyzed'),
      },
    };
  }

  async update(clientId: string, dto: UpdateClientSettingsDto): Promise<ClientSettingsDto> {
    const current = await this.get(clientId);
    const o = dto.overrides;
    if (o) {
      const min = o.repsMin !== undefined ? o.repsMin : current.overrides.repsMin;
      const max = o.repsMax !== undefined ? o.repsMax : current.overrides.repsMax;
      if ((min === null) !== (max === null)) throw new BadRequestException('Set both rep-range bounds or neither');
      if (min !== null && max !== null && min > max) throw new BadRequestException('repsMin cannot exceed repsMax');
    }

    const linkData: Prisma.CoachClientUpdateInput = {
      ...(o ? Object.fromEntries(OVERRIDE_KEYS.filter((k) => o[k] !== undefined).map((k) => [k, o[k]])) : {}),
      ...(dto.autoApprove !== undefined ? { autoApprove: dto.autoApprove } : {}),
      ...(dto.autoApproveMaxKg !== undefined ? { autoApproveMaxKg: dto.autoApproveMaxKg } : {}),
    };
    const p = dto.profile;
    const profileData = p
      ? (Object.fromEntries(PROFILE_KEYS.filter((k) => p[k] !== undefined).map((k) => [k, p[k] === '' ? null : p[k]])) as Prisma.ClientProfileUncheckedUpdateInput)
      : null;

    await this.prisma.$transaction([
      this.prisma.coachClient.update({ where: { clientId }, data: linkData }),
      this.prisma.user.update({
        where: { id: clientId },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.weightUnit ? { weightUnit: dto.weightUnit } : {}),
        },
      }),
      ...(profileData
        ? [
            this.prisma.clientProfile.upsert({
              where: { clientId },
              create: { ...(profileData as Prisma.ClientProfileUncheckedCreateInput), clientId },
              update: profileData,
            }),
          ]
        : []),
    ]);
    return this.get(clientId);
  }
}
