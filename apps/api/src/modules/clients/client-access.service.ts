import { Injectable, NotFoundException } from '@nestjs/common';
import { CoachClientStatus } from '@prisma/client';
import { Role } from '@coaching/shared';
import type { RequestUser } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tenancy boundary. Every client-scoped read/write must pass through here.
 * Denials are 404 (not 403) so IDs cannot be enumerated across tenants.
 */
@Injectable()
export class ClientAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanAccessClient(user: RequestUser, clientId: string): Promise<void> {
    if (user.role === Role.CLIENT && user.id === clientId) return;

    if (user.role === Role.COACH) {
      const link = await this.prisma.coachClient.findFirst({
        where: { coachId: user.id, clientId, status: CoachClientStatus.ACTIVE },
        select: { id: true },
      });
      if (link) return;
    }

    throw new NotFoundException('Client not found');
  }
}
