import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

/** Global exercises plus those owned by the client's coach. Anything else is a 400, never a leak of other tenants' rows. */
export async function assertExercisesVisible(prisma: PrismaService, clientId: string, exerciseIds: readonly string[]): Promise<void> {
  const ids = [...new Set(exerciseIds)];
  if (ids.length === 0) return;
  const link = await prisma.coachClient.findUnique({ where: { clientId }, select: { coachId: true } });
  const found = await prisma.exercise.count({
    where: { id: { in: ids }, OR: [{ coachId: null }, ...(link ? [{ coachId: link.coachId }] : [])] },
  });
  if (found !== ids.length) throw new BadRequestException('Unknown exercise');
}
