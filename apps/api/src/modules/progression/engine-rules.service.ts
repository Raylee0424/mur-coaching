import { Injectable } from '@nestjs/common';
import type { CoachEngineRules } from '@prisma/client';
import { ENGINE_DEFAULTS } from '@coaching/shared';
import type { CoachEngineRulesDto, EngineRuleKey, UpdateCoachEngineRulesRequest } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';

const KEYS = Object.keys(ENGINE_DEFAULTS) as EngineRuleKey[];

/** Coach-level engine thresholds. A missing row means "all defaults". */
@Injectable()
export class EngineRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(coachId: string): Promise<CoachEngineRulesDto> {
    const row = await this.prisma.coachEngineRules.findUnique({ where: { coachId } });
    return this.toDto(row);
  }

  async replace(coachId: string, rules: UpdateCoachEngineRulesRequest): Promise<CoachEngineRulesDto> {
    const data = Object.fromEntries(KEYS.map((k) => [k, rules[k] ?? null]));
    const row = await this.prisma.coachEngineRules.upsert({
      where: { coachId },
      create: { coachId, ...data },
      update: data,
    });
    return this.toDto(row);
  }

  async reset(coachId: string): Promise<CoachEngineRulesDto> {
    await this.prisma.coachEngineRules.deleteMany({ where: { coachId } });
    return this.toDto(null);
  }

  private toDto(row: CoachEngineRules | null): CoachEngineRulesDto {
    const rules = Object.fromEntries(
      KEYS.map((k) => {
        const v = row?.[k] ?? null;
        return [k, v === null ? null : Number(v)];
      }),
    ) as unknown as CoachEngineRulesDto['rules'];
    const effective = Object.fromEntries(
      KEYS.map((k) => [k, rules[k] ?? ENGINE_DEFAULTS[k]]),
    ) as unknown as CoachEngineRulesDto['effective'];
    return { rules, effective, updatedAt: row?.updatedAt.toISOString() ?? null };
  }
}
