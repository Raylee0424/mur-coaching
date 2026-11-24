import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LeadSource, LeadStage, leadStats } from '@coaching/shared';
import type { LeadAnswerDto, LeadBoardDto, LeadDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateLeadDto, UpdateLeadDto } from './dto/leads.dto';

const leadInclude = (now: Date) =>
  ({
    responses: { orderBy: { createdAt: 'desc' }, take: 1, select: { answers: true } },
    invites: { where: { acceptedAt: null, expiresAt: { gt: now } }, select: { id: true }, take: 1 },
  }) satisfies Prisma.LeadInclude;

type LeadRow = Prisma.LeadGetPayload<{ include: ReturnType<typeof leadInclude> }>;

const toDto = (l: LeadRow): LeadDto => ({
  id: l.id,
  name: l.name,
  email: l.email,
  phone: l.phone,
  goal: l.goal,
  trainingDays: l.trainingDays,
  experienceYears: l.experienceYears,
  source: l.source,
  stage: l.stage,
  monthlyValueCents: l.monthlyValueCents,
  callAt: l.callAt?.toISOString() ?? null,
  notes: l.notes,
  invitePending: l.invites.length > 0,
  convertedClientId: l.convertedClientId,
  convertedAt: l.convertedAt?.toISOString() ?? null,
  createdAt: l.createdAt.toISOString(),
  answers: (l.responses[0]?.answers as unknown as LeadAnswerDto[] | undefined) ?? [],
});

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async board(coachId: string): Promise<LeadBoardDto> {
    const [rows, brand] = await Promise.all([
      this.prisma.lead.findMany({ where: { coachId }, include: leadInclude(new Date()), orderBy: { createdAt: 'desc' } }),
      this.prisma.coachBrand.findUnique({ where: { coachId }, select: { slug: true, acceptingLeads: true } }),
    ]);
    const leads = rows.map(toDto);
    return { leads, stats: leadStats(leads), applyPath: brand ? `/apply/${brand.slug}` : null, acceptingLeads: brand?.acceptingLeads ?? false };
  }

  async create(coachId: string, dto: CreateLeadDto): Promise<LeadDto> {
    try {
      const row = await this.prisma.lead.create({
        data: {
          coachId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone || null,
          goal: dto.goal || null,
          monthlyValueCents: dto.monthlyValueCents ?? null,
          source: LeadSource.MANUAL,
        },
        include: leadInclude(new Date()),
      });
      return toDto(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new ConflictException('You already have a lead with that email.');
      throw err;
    }
  }

  async update(coachId: string, id: string, dto: UpdateLeadDto): Promise<LeadDto> {
    const lead = await this.prisma.lead.findFirst({ where: { id, coachId }, select: { stage: true } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (dto.stage !== undefined && dto.stage !== lead.stage) {
      if (lead.stage === LeadStage.ACTIVE) throw new BadRequestException('This lead already became a client.');
      if (dto.stage === LeadStage.ACTIVE) throw new BadRequestException('A lead becomes active when they accept your invite.');
    }
    const row = await this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.stage !== undefined ? { stage: dto.stage } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
        ...(dto.monthlyValueCents !== undefined ? { monthlyValueCents: dto.monthlyValueCents } : {}),
        ...(dto.callAt !== undefined ? { callAt: dto.callAt ? new Date(dto.callAt) : null } : {}),
      },
      include: leadInclude(new Date()),
    });
    return toDto(row);
  }

  async remove(coachId: string, id: string): Promise<void> {
    const { count } = await this.prisma.lead.deleteMany({ where: { id, coachId } });
    if (count === 0) throw new NotFoundException('Lead not found');
  }
}
