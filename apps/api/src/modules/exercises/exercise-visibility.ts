import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * The exercises a viewer may see: the global library (no coach, no owner), plus the coach's custom exercises,
 * plus the athlete's own. Pass `coachId` for a coach or a coached client, `ownerId` for an athlete.
 * Every exercise lookup goes through this so athlete-owned rows never leak into the global library.
 */
export function exerciseScope(viewer: { coachId?: string | null; ownerId?: string | null }): Prisma.ExerciseWhereInput {
  return {
    OR: [
      { coachId: null, ownerId: null },
      ...(viewer.coachId ? [{ coachId: viewer.coachId }] : []),
      ...(viewer.ownerId ? [{ ownerId: viewer.ownerId }] : []),
    ],
  };
}

/** A client's scope: global, their coach's (if linked) and their own. */
export async function clientExerciseScope(prisma: PrismaService, clientId: string): Promise<Prisma.ExerciseWhereInput> {
  const link = await prisma.coachClient.findUnique({ where: { clientId }, select: { coachId: true } });
  return exerciseScope({ coachId: link?.coachId ?? null, ownerId: clientId });
}

/** Global exercises, those owned by the client's coach, and the client's own. Anything else is a 400, never a leak of other tenants' rows. */
export async function assertExercisesVisible(prisma: PrismaService, clientId: string, exerciseIds: readonly string[]): Promise<void> {
  const ids = [...new Set(exerciseIds)];
  if (ids.length === 0) return;
  const found = await prisma.exercise.count({ where: { id: { in: ids }, ...(await clientExerciseScope(prisma, clientId)) } });
  if (found !== ids.length) throw new BadRequestException('Unknown exercise');
}
