import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthTokenType, BillingEventType, CoachClientStatus, Prisma, Role as PrismaRole, SubscriptionStatus } from '@prisma/client';
import { PlanId, planById } from '@coaching/shared';
import type { AuthTokenResponse, AuthUser, JwtPayload, Role } from '@coaching/shared';
import { EnvService } from '../../config/env.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { ResetPasswordDto, SignupDto } from './dto/account.dto';
import {
  MAX_CODE_ATTEMPTS,
  RESET_TOKEN_TTL_MS,
  VERIFY_CODE_TTL_MS,
  afterFailedLogin,
  clearedLockout,
  generateCode,
  generateToken,
  hashCode,
  hashToken,
  isLocked,
  isUsable,
  lockMinutesLeft,
  resendWaitSeconds,
  RESEND_WINDOW_MS,
} from './token-utils';
import { isAccessibleLink } from '../clients/link-status';
import { isModeratorEmail } from '../moderation/moderators';

/** New coaches start the plan's free trial: no card, full features, plan seat count. */
function coachTrial(role: Role): Pick<Prisma.UserCreateInput, 'subscription' | 'billingEvents'> {
  const plan = planById(PlanId.COACH);
  if (role !== PrismaRole.COACH || !plan) return {};
  return {
    subscription: {
      create: { planId: plan.id, status: SubscriptionStatus.TRIALING, trialEndsAt: new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) },
    },
    billingEvents: { create: { type: BillingEventType.TRIAL_STARTED, planId: plan.id, status: SubscriptionStatus.TRIALING } },
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly env: EnvService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokenResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const now = new Date();
    if (user && isLocked(user.lockedUntil, now)) {
      // Checked before the password so a locked account cannot be probed.
      throw new HttpException(
        `Too many failed attempts. Try again in ${lockMinutesLeft(user.lockedUntil as Date, now)} minutes.`,
        423 /* Locked */,
      );
    }
    // Same error for unknown email and wrong password.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: afterFailedLogin({ failedLoginCount: user.failedLoginCount, lockedUntil: user.lockedUntil }, now),
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.failedLoginCount > 0 || user.lockedUntil) {
      await this.prisma.user.update({ where: { id: user.id }, data: clearedLockout() });
    }
    return this.sign({ sub: user.id, role: user.role });
  }

  /** Creates the account (unverified), mails a 6-digit code and signs the user in. */
  async signup(dto: SignupDto): Promise<AuthTokenResponse> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    let user;
    try {
      user = await this.prisma.user.create({
        data: { email: dto.email, name: dto.name, role: dto.role as PrismaRole, passwordHash, ...coachTrial(dto.role) },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
    await this.issueVerificationCode(user.id, user.email);
    return this.sign({ sub: user.id, role: user.role });
  }

  async verifyEmail(userId: string, code: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerifiedAt) return this.me(userId);

    const now = new Date();
    const token = await this.prisma.authToken.findFirst({
      where: { userId, type: AuthTokenType.EMAIL_VERIFY, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    const invalid = new BadRequestException('Invalid or expired code');
    if (!token || !isUsable(token, now) || token.attempts >= MAX_CODE_ATTEMPTS) throw invalid;

    if (token.tokenHash !== hashCode(userId, code)) {
      const attempts = token.attempts + 1;
      // The code dies after too many wrong guesses; the user must request a new one.
      await this.prisma.authToken.update({
        where: { id: token.id },
        data: { attempts, ...(attempts >= MAX_CODE_ATTEMPTS ? { usedAt: now } : {}) },
      });
      throw invalid;
    }
    await this.prisma.$transaction([
      this.prisma.authToken.update({ where: { id: token.id }, data: { usedAt: now } }),
      this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: now } }),
    ]);
    return this.me(userId);
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerifiedAt: true } });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerifiedAt) return;
    const wait = resendWaitSeconds(await this.recentTokenTimes(userId, AuthTokenType.EMAIL_VERIFY));
    if (wait > 0) {
      throw new HttpException(`Wait ${wait} seconds before requesting another code.`, HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.issueVerificationCode(userId, user.email);
  }

  /** Creation times of this account's tokens of one type in the resend window. */
  private async recentTokenTimes(userId: string, type: AuthTokenType): Promise<Date[]> {
    const rows = await this.prisma.authToken.findMany({
      where: { userId, type, createdAt: { gt: new Date(Date.now() - RESEND_WINDOW_MS) } },
      select: { createdAt: true },
    });
    return rows.map((r) => r.createdAt);
  }

  /** Always resolves: whether the email exists is never revealed. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) return;
    // Throttled silently per account: a 429 here would reveal that the email exists.
    if (resendWaitSeconds(await this.recentTokenTimes(user.id, AuthTokenType.PASSWORD_RESET)) > 0) return;
    const raw = generateToken();
    await this.prisma.$transaction([
      this.prisma.authToken.updateMany({
        where: { userId: user.id, type: AuthTokenType.PASSWORD_RESET, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.authToken.create({
        data: {
          userId: user.id,
          type: AuthTokenType.PASSWORD_RESET,
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }),
    ]);
    this.mail.sendPasswordReset(user.email, raw);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const token = await this.prisma.authToken.findUnique({ where: { tokenHash: hashToken(dto.token) } });
    const now = new Date();
    if (!token || token.type !== AuthTokenType.PASSWORD_RESET || !isUsable(token, now)) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    // Conditional claim so a token cannot be redeemed twice by concurrent requests.
    const claimed = await this.prisma.authToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt: now } });
    if (claimed.count === 0) throw new BadRequestException('This reset link is invalid or has expired');
    await this.prisma.user.update({ where: { id: token.userId }, data: { passwordHash, ...clearedLockout() } });
  }

  private async issueVerificationCode(userId: string, email: string): Promise<void> {
    const code = generateCode();
    await this.prisma.$transaction([
      this.prisma.authToken.updateMany({
        where: { userId, type: AuthTokenType.EMAIL_VERIFY, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.authToken.create({
        data: {
          userId,
          type: AuthTokenType.EMAIL_VERIFY,
          tokenHash: hashCode(userId, code),
          expiresAt: new Date(Date.now() + VERIFY_CODE_TTL_MS),
        },
      }),
    ]);
    this.mail.sendVerificationCode(email, code);
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
      emailVerified: user.emailVerifiedAt !== null,
      isModerator: isModeratorEmail(this.env.get('MODERATOR_EMAILS'), user.email),
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

  /** Signs a session token for an already-authenticated user (invite acceptance). */
  issueToken(userId: string, role: Role): AuthTokenResponse {
    return this.sign({ sub: userId, role });
  }

  private sign(payload: JwtPayload): AuthTokenResponse {
    return { accessToken: this.jwt.sign(payload) };
  }
}
