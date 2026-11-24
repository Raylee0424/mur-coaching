import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ClientGroupDto, GroupAssignOutcome } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES } from '../clients/link-status';
import { ProgramsService } from '../programs/programs.service';
import type { GroupAssignDto, SaveClientGroupDto } from './dto/client-group.dto';

const groupInclude = { members: { select: { clientId: true } } } satisfies Prisma.ClientGroupInclude;

const toDto = (g: Prisma.ClientGroupGetPayload<{ include: typeof groupInclude }>): ClientGroupDto => ({
  id: g.id,
  name: g.name,
  memberIds: g.members.map((m) => m.clientId),
  createdAt: g.createdAt.toISOString(),
});

/** A coach's named sets of clients, used to assign one program to many athletes at once. */
@Injectable()
export class ClientGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programs: ProgramsService,
  ) {}

  async list(coachId: string): Promise<ClientGroupDto[]> {
    const rows = await this.prisma.clientGroup.findMany({ where: { coachId }, orderBy: { name: 'asc' }, include: groupInclude });
    return rows.map(toDto);
  }

  async create(coachId: string, dto: SaveClientGroupDto): Promise<ClientGroupDto> {
    const memberIds = await this.accessibleOnly(coachId, dto.memberIds);
    try {
      const row = await this.prisma.clientGroup.create({
        data: { coachId, name: dto.name, members: { create: memberIds.map((clientId) => ({ clientId })) } },
        include: groupInclude,
      });
      return toDto(row);
    } catch (err) {
      throw this.nameClash(err);
    }
  }

  async replace(coachId: string, id: string, dto: SaveClientGroupDto): Promise<ClientGroupDto> {
    await this.owned(coachId, id);
    const memberIds = await this.accessibleOnly(coachId, dto.memberIds);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.clientGroupMember.deleteMany({ where: { groupId: id } });
        return tx.clientGroup.update({
          where: { id },
          data: { name: dto.name, members: { create: memberIds.map((clientId) => ({ clientId })) } },
          include: groupInclude,
        });
      });
      return toDto(row);
    } catch (err) {
      throw this.nameClash(err);
    }
  }

  async remove(coachId: string, id: string): Promise<void> {
    await this.owned(coachId, id);
    await this.prisma.clientGroup.delete({ where: { id } });
  }

  /**
   * Assigns the program to every member, one atomic assignment each (it replaces that client's current program).
   * A member who left the coach's roster is reported, not assigned. Partial success is the normal outcome shape.
   */
  async assign(coachId: string, id: string, dto: GroupAssignDto): Promise<GroupAssignOutcome[]> {
    const group = await this.prisma.clientGroup.findFirst({ where: { id, coachId }, include: groupInclude });
    if (!group) throw new NotFoundException('Group not found');
    const program = await this.prisma.program.findFirst({ where: { id: dto.programId, coachId }, select: { id: true } });
    if (!program) throw new BadRequestException('Unknown program');

    const memberIds = group.members.map((m) => m.clientId);
    const onRoster = new Set(await this.accessibleOnly(coachId, memberIds, false));
    const outcomes: GroupAssignOutcome[] = [];
    for (const clientId of memberIds) {
      if (!onRoster.has(clientId)) {
        outcomes.push({ clientId, ok: false, error: 'No longer on your roster' });
        continue;
      }
      try {
        await this.programs.assign(coachId, clientId, dto.programId, dto.startDate, id);
        outcomes.push({ clientId, ok: true });
      } catch (err) {
        outcomes.push({ clientId, ok: false, error: err instanceof Error ? err.message : 'Could not assign' });
      }
    }
    return outcomes;
  }

  private async owned(coachId: string, id: string): Promise<void> {
    if (!(await this.prisma.clientGroup.findFirst({ where: { id, coachId }, select: { id: true } }))) throw new NotFoundException('Group not found');
  }

  /** Tenancy: only clients with an accessible link to this coach. `strict` rejects any other id. */
  private async accessibleOnly(coachId: string, ids: readonly string[], strict = true): Promise<string[]> {
    const unique = [...new Set(ids)];
    const found = await this.prisma.coachClient.findMany({
      where: { coachId, clientId: { in: unique }, status: { in: [...ACCESSIBLE_LINK_STATUSES] } },
      select: { clientId: true },
    });
    if (strict && found.length !== unique.length) throw new BadRequestException('Unknown client');
    return found.map((f) => f.clientId);
  }

  private nameClash(err: unknown): unknown {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' ? new ConflictException('You already have a group with that name') : err;
  }
}
