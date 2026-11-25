import type { PrismaClient } from '@prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { RecordsService } from '../../src/modules/records/records.service';

/**
 * The seed writes logs straight through Prisma, so the API's post-commit record rebuild never runs.
 * Rebuild each client's records per logged exercise with the same service the API uses.
 */
export async function seedRecords(prisma: PrismaClient, clientIds: readonly string[]): Promise<number> {
  const records = new RecordsService(prisma as PrismaService);
  for (const clientId of clientIds) {
    const logged = await prisma.exerciseLog.findMany({
      where: { workoutLog: { clientId } },
      distinct: ['exerciseId'],
      select: { exerciseId: true },
    });
    for (const { exerciseId } of logged) await records.rebuild(clientId, exerciseId);
  }
  return prisma.personalRecord.count({ where: { clientId: { in: [...clientIds] } } });
}
