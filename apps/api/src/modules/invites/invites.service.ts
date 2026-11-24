import { ConflictException, GoneException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AssignmentStatus, Prisma, Role } from '@prisma/client';
import type {
  AcceptInviteResponse,
  CreateInviteResponse,
  InviteDto,
  InvitePreviewDto,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { INVITE_TTL_MS, generateToken, hashToken, isExpired } from '../auth/token-utils';
import { MailService } from '../mail/mail.service';
import { EntitlementsService } from '../billing/entitlements.service';
import type { AcceptInviteDto, CreateInviteDto } from './dto/invites.dto';

const inviteInclude = { program: { select: { name: true } } } satisfies Prisma.InviteInclude;
type InviteRow = Prisma.InviteGetPayload<{ include: typeof inviteInclude }>;

const toDto = (i: InviteRow, now: Date): InviteDto => ({
  id: i.id,
  name: i.name,
  email: i.email,
  phone: i.phone,
  programId: i.programId,
  programName: i.program?.name ?? null,
  startDate: i.startDate?.toISOString() ?? null,
  weightUnit: i.weightUnit,
  expiresAt: i.expiresAt.toISOString(),
  createdAt: i.createdAt.toISOString(),
  expired: isExpired(i.expiresAt, now),
});

const dateOnly = (yyyyMmDd: string): Date => new Date(`${yyyyMmDd.slice(0, 10)}T00:00:00.000Z`);

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly mail: MailService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** Replaces any earlier pending invite from this coach to the same email. */
  async create(coachId: string, dto: CreateInviteDto): Promise<CreateInviteResponse> {
    if (await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } })) {
      throw new ConflictException('Email already registered');
    }
    if (dto.programId) {
      const program = await this.prisma.program.findFirst({ where: { id: dto.programId, coachId }, select: { id: true } });
      if (!program) throw new NotFoundException('Program not found');
    }
    // A pending invite holds a seat, so acceptance never pushes the coach over the limit.
    await this.entitlements.assertSeat(coachId, dto.email);
    const coach = await this.prisma.user.findUniqueOrThrow({ where: { id: coachId }, select: { name: true, displayName: true } });

    const raw = generateToken();
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.invite.deleteMany({ where: { coachId, email: dto.email, acceptedAt: null } });
      return tx.invite.create({
        data: {
          coachId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone || null,
          programId: dto.programId ?? null,
          startDate: dto.startDate ? dateOnly(dto.startDate) : null,
          weightUnit: dto.weightUnit ?? 'KG',
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
        include: inviteInclude,
      });
    });
    const inviteUrl = this.mail.webUrl(`/invite/${raw}`);
    this.mail.sendInvite(dto.email, coach.displayName ?? coach.name, inviteUrl);
    return { invite: toDto(row, new Date()), inviteUrl };
  }

  /** Pending = not accepted. Expired ones are included (flagged) so they can be revoked. */
  async listPending(coachId: string): Promise<InviteDto[]> {
    const now = new Date();
    const rows = await this.prisma.invite.findMany({
      where: { coachId, acceptedAt: null },
      include: inviteInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => toDto(r, now));
  }

  async revoke(coachId: string, id: string): Promise<void> {
    const { count } = await this.prisma.invite.deleteMany({ where: { id, coachId, acceptedAt: null } });
    if (count === 0) throw new NotFoundException('Invite not found');
  }

  async preview(token: string): Promise<InvitePreviewDto> {
    const invite = await this.findUsable(token);
    return {
      coachName: invite.coach.displayName ?? invite.coach.name,
      programName: invite.program?.name ?? null,
      startDate: invite.startDate?.toISOString() ?? null,
      name: invite.name,
      email: invite.email,
    };
  }

  async accept(token: string, dto: AcceptInviteDto): Promise<AcceptInviteResponse> {
    const invite = await this.findUsable(token);
    if (await this.prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } })) {
      throw new ConflictException('Email already registered');
    }
    // The invite held a seat when it was sent, but the coach's plan may have lapsed or the roster filled since.
    const seat = await this.entitlements.seatFor(invite.coachId, invite.email);
    if (!seat.ok) {
      throw new HttpException(
        seat.reason === 'NO_PLAN'
          ? "This coach's plan is not active, so they can't take new clients right now. Ask them to renew, then open the link again."
          : "This coach's roster is full right now. Ask them to free a seat, then open the link again.",
        402,
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const now = new Date();

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // Claim first: a second concurrent accept sees count 0 and gets 410.
        const claimed = await tx.invite.updateMany({
          where: { id: invite.id, acceptedAt: null, expiresAt: { gt: now } },
          data: { acceptedAt: now },
        });
        if (claimed.count === 0) throw new GoneException('This invite is no longer valid');

        const created = await tx.user.create({
          data: {
            email: invite.email,
            name: dto.name,
            role: Role.CLIENT,
            passwordHash,
            weightUnit: invite.weightUnit,
            emailVerifiedAt: now, // they proved control of the inbox by opening the link
          },
        });
        await tx.coachClient.create({ data: { coachId: invite.coachId, clientId: created.id } });
        if (invite.programId) {
          await tx.programAssignment.create({
            data: {
              programId: invite.programId,
              clientId: created.id,
              startDate: invite.startDate ?? dateOnly(now.toISOString()),
              status: AssignmentStatus.ACTIVE,
            },
          });
        }
        return created;
      });
      return this.auth.issueToken(user.id, user.role);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
  }

  /** 404 unknown token, 410 expired or already accepted. */
  private async findUsable(token: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { program: { select: { name: true } }, coach: { select: { name: true, displayName: true } } },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.acceptedAt || isExpired(invite.expiresAt)) throw new GoneException('This invite has expired or was already used');
    return invite;
  }
}
