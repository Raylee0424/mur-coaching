import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestUser } from '../../common/auth-user';
import { EnvService } from '../../config/env.service';
import { PrismaService } from '../../prisma/prisma.service';
import { isModeratorEmail } from './moderators';

/**
 * Lets platform moderators (MODERATOR_EMAILS) through, any role. 404, never 403, so the route's existence is not
 * revealed (same rule as the social module). The email comes from the DB on every request: the JWT does not carry it,
 * and a changed email takes effect at once.
 */
@Injectable()
export class ModeratorGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    if (!user) throw new NotFoundException();
    const row = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    if (!row || !isModeratorEmail(this.env.get('MODERATOR_EMAILS'), row.email)) throw new NotFoundException();
    return true;
  }
}
