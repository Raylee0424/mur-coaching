import { HttpException, Injectable } from '@nestjs/common';
import { AI_DAILY_CAPS } from '@coaching/shared';
import type { AiUsageKind } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';

const today = (): Date => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

/** Per-client daily caps on top of the per-IP @RateLimit. */
@Injectable()
export class AiUsageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Counts one request and returns how many are left today. The increment is a single upsert, so concurrent
   * requests cannot slip past the cap; a request over the cap is refunded and answered 429.
   */
  async consume(clientId: string, kind: AiUsageKind): Promise<number> {
    const day = today();
    const key = { clientId_day_kind: { clientId, day, kind } };
    const row = await this.prisma.aiUsage.upsert({
      where: key,
      create: { clientId, day, kind, count: 1 },
      update: { count: { increment: 1 } },
    });
    const cap = AI_DAILY_CAPS[kind];
    if (row.count > cap) {
      await this.prisma.aiUsage.update({ where: key, data: { count: { decrement: 1 } } });
      throw new HttpException(`Daily AI limit reached (${cap} per day). It resets at 00:00 UTC.`, 429);
    }
    return cap - row.count;
  }
}
