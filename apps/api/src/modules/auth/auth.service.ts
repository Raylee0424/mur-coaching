import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CoachClientStatus, Role as PrismaRole } from '@prisma/client';
import type { AuthTokenResponse, AuthUser, JwtPayload, Role } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokenResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Same error for unknown email and wrong password.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.sign({ sub: user.id, role: user.role });
  }

  async demoLogin(role: Role): Promise<AuthTokenResponse> {
    const user = await this.prisma.user.findFirst({
      where: { isDemo: true, role: role as PrismaRole },
      orderBy: { createdAt: 'asc' },
    });
    if (!user) throw new NotFoundException('Demo user not seeded');
    return this.sign({ sub: user.id, role: user.role });
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { coachLink: true },
    });
    if (!user) throw new UnauthorizedException();

    const activeClientCount =
      user.role === PrismaRole.COACH
        ? await this.prisma.coachClient.count({
            where: { coachId: user.id, status: CoachClientStatus.ACTIVE },
          })
        : null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isDemo: user.isDemo,
      coachId: user.coachLink?.status === CoachClientStatus.ACTIVE ? user.coachLink.coachId : null,
      activeClientCount,
    };
  }

  private sign(payload: JwtPayload): AuthTokenResponse {
    return { accessToken: this.jwt.sign(payload) };
  }
}
