import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CoachClientStatus, Role as PrismaRole } from '@prisma/client';
import type { AuthTokenResponse, AuthUser, JwtPayload, Role } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateMeDto } from './dto/update-me.dto';
import { isAccessibleLink } from '../clients/link-status';

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
      coachId: isAccessibleLink(user.coachLink?.status) ? (user.coachLink?.coachId ?? null) : null,
      activeClientCount,
      weightUnit: user.weightUnit,
      displayName: user.displayName,
      onboardedAt: user.onboardedAt?.toISOString() ?? null,
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<AuthUser> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.displayName !== undefined ? { displayName: dto.displayName || null } : {}),
        ...(dto.weightUnit ? { weightUnit: dto.weightUnit } : {}),
      },
    });
    return this.me(userId);
  }

  async completeOnboarding(userId: string): Promise<AuthUser> {
    await this.prisma.user.updateMany({ where: { id: userId, onboardedAt: null }, data: { onboardedAt: new Date() } });
    return this.me(userId);
  }

  private sign(payload: JwtPayload): AuthTokenResponse {
    return { accessToken: this.jwt.sign(payload) };
  }
}
