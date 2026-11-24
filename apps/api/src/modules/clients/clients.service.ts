import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { AssignmentStatus, CoachClientStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { isAccessibleLink } from './link-status';
import { CreateClientDto, ListClientsQuery, UpdateClientDto } from './dto/clients.dto';

const clientUserSelect = { id: true, email: true, name: true, createdAt: true } satisfies Prisma.UserSelect;

const activeAssignmentSelect = {
  id: true,
  programId: true,
  startDate: true,
  program: { select: { name: true, durationWeeks: true } },
} satisfies Prisma.ProgramAssignmentSelect;

const rosterSelect = {
  status: true,
  notes: true,
  createdAt: true,
  client: {
    select: {
      ...clientUserSelect,
      assignments: { where: { status: AssignmentStatus.ACTIVE }, select: activeAssignmentSelect, take: 1 },
    },
  },
} satisfies Prisma.CoachClientSelect;

type RosterRow = Prisma.CoachClientGetPayload<{ select: typeof rosterSelect }>;

export interface ClientView {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  /** Coach-private; null when the viewer is the client. */
  notes: string | null;
  status: CoachClientStatus;
  activeAssignment: RosterRow['client']['assignments'][number] | null;
}

const TEMP_PASSWORD_BYTES = 9; // 12 base64url chars

/** Callers authorize first (ClientAccessService); methods taking coachId trust it. */
@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async list(coachId: string, q: ListClientsQuery): Promise<ClientView[]> {
    const rows = await this.prisma.coachClient.findMany({
      where: { coachId, ...(q.status ? { status: q.status } : {}) },
      select: rosterSelect,
      orderBy: { client: { name: 'asc' } },
    });
    return rows.map((r) => this.toView(r, true));
  }

  /** Returns the temporary password exactly once; only its hash is stored. */
  async create(coachId: string, dto: CreateClientDto): Promise<{ client: ClientView; temporaryPassword: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (existing) throw new ConflictException('Email already registered');
    await this.entitlements.assertSeat(coachId);

    const temporaryPassword = randomBytes(TEMP_PASSWORD_BYTES).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    try {
      const row = await this.prisma.coachClient.create({
        data: {
          coach: { connect: { id: coachId } },
          notes: dto.notes ?? null,
          client: { create: { email: dto.email, name: dto.name, role: Role.CLIENT, passwordHash } },
        },
        select: rosterSelect,
      });
      return { client: this.toView(row, true), temporaryPassword };
    } catch (err) {
      // Lost a race with another signup using the same email.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
  }

  /** `includeNotes` is true only for the client's coach. */
  async getProfile(clientId: string, includeNotes: boolean): Promise<ClientView> {
    const row = await this.prisma.coachClient.findUnique({ where: { clientId }, select: rosterSelect });
    if (!row) throw new NotFoundException('Client not found');
    return this.toView(row, includeNotes);
  }

  /** Coach-only. Works for ARCHIVED clients too so they can be restored. */
  async update(coachId: string, clientId: string, dto: UpdateClientDto): Promise<ClientView> {
    const link = await this.prisma.coachClient.findFirst({ where: { coachId, clientId }, select: { id: true, status: true } });
    if (!link) throw new NotFoundException('Client not found');
    // Leaving ARCHIVED (to ACTIVE or PAUSED) takes a seat; ACTIVE <-> PAUSED and archiving never need one.
    if (dto.status && isAccessibleLink(dto.status) && !isAccessibleLink(link.status)) await this.entitlements.assertSeat(coachId);

    const row = await this.prisma.coachClient.update({
      where: { id: link.id },
      data: {
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.name ? { client: { update: { name: dto.name } } } : {}),
      },
      select: rosterSelect,
    });
    return this.toView(row, true);
  }

  private toView(row: RosterRow, includeNotes: boolean): ClientView {
    const { assignments, ...user } = row.client;
    return {
      ...user,
      notes: includeNotes ? row.notes : null,
      status: row.status,
      activeAssignment: assignments[0] ?? null,
    };
  }
}
