import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LeadSource, LeadStage, SLUG_LIMITS, resolveIntakeAnswers, slugify, validateIntakeQuestions } from '@coaching/shared';
import type { IntakeFormDto, IntakeQuestion, PublicIntakeDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { SaveIntakeFormDto, SubmitIntakeDto } from './dto/leads.dto';

const asQuestions = (json: Prisma.JsonValue): IntakeQuestion[] => (Array.isArray(json) ? (json as unknown as IntakeQuestion[]) : []);

/** The coach's public intake form (brand identity + questions) and the public submit. */
@Injectable()
export class IntakeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates the brand and an empty form on first read, so the coach always has a link to share. */
  async getForm(coachId: string): Promise<IntakeFormDto> {
    const [brand, form] = await Promise.all([this.ensureBrand(coachId), this.prisma.intakeForm.findUnique({ where: { coachId } })]);
    return { slug: brand.slug, headline: brand.headline, intro: brand.intro, acceptingLeads: brand.acceptingLeads, questions: asQuestions(form?.questions ?? []) };
  }

  async saveForm(coachId: string, dto: SaveIntakeFormDto): Promise<IntakeFormDto> {
    const questions: IntakeQuestion[] = dto.questions.map((q) => ({
      id: q.id,
      label: q.label,
      required: q.required,
      type: q.type,
      ...(q.type === 'CHOICE' ? { options: (q.options ?? []).map((o) => o.trim()) } : {}),
    }));
    const problem = validateIntakeQuestions(questions);
    if (problem) throw new BadRequestException(problem);
    await this.ensureBrand(coachId);
    try {
      await this.prisma.$transaction([
        this.prisma.coachBrand.update({
          where: { coachId },
          data: { slug: dto.slug, headline: dto.headline, intro: dto.intro, acceptingLeads: dto.acceptingLeads },
        }),
        this.prisma.intakeForm.upsert({
          where: { coachId },
          create: { coachId, questions: questions as unknown as Prisma.InputJsonValue },
          update: { questions: questions as unknown as Prisma.InputJsonValue },
        }),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new ConflictException('That link is taken. Choose another.');
      throw err;
    }
    return this.getForm(coachId);
  }

  async preview(slug: string): Promise<PublicIntakeDto> {
    const brand = await this.openBrand(slug);
    const form = await this.prisma.intakeForm.findUnique({ where: { coachId: brand.coachId } });
    return {
      coachName: brand.coach.displayName ?? brand.coach.name,
      headline: brand.headline,
      intro: brand.intro,
      questions: asQuestions(form?.questions ?? []),
    };
  }

  /**
   * Public submit. A filled honeypot gets the same success with nothing stored. A repeat email adds a response
   * to the existing lead instead of a second card, and reopens a lead the coach had marked lost.
   */
  async submit(slug: string, dto: SubmitIntakeDto): Promise<{ received: true }> {
    if (dto.website) return { received: true };
    const brand = await this.openBrand(slug);
    const form = await this.prisma.intakeForm.findUnique({ where: { coachId: brand.coachId } });
    const resolved = resolveIntakeAnswers(asQuestions(form?.questions ?? []), dto.answers);
    if (!resolved.ok) throw new BadRequestException(resolved.error);

    const profile = {
      name: dto.name,
      phone: dto.phone || null,
      goal: dto.goal || null,
      trainingDays: dto.trainingDays ?? null,
      experienceYears: dto.experienceYears ?? null,
    };
    await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.upsert({
        where: { coachId_email: { coachId: brand.coachId, email: dto.email } },
        create: { coachId: brand.coachId, email: dto.email, source: LeadSource.WEB_FORM, ...profile },
        update: profile,
      });
      await tx.lead.updateMany({ where: { id: lead.id, stage: LeadStage.LOST }, data: { stage: LeadStage.NEW } });
      await tx.intakeResponse.create({ data: { leadId: lead.id, formId: form?.id ?? null, answers: resolved.answers as unknown as Prisma.InputJsonValue } });
    });
    return { received: true };
  }

  private async openBrand(slug: string) {
    const brand = await this.prisma.coachBrand.findUnique({ where: { slug }, include: { coach: { select: { name: true, displayName: true } } } });
    if (!brand || !brand.acceptingLeads) throw new NotFoundException('This application form is not available.');
    return brand;
  }

  private async ensureBrand(coachId: string) {
    const existing = await this.prisma.coachBrand.findUnique({ where: { coachId } });
    if (existing) return existing;
    const coach = await this.prisma.user.findUniqueOrThrow({ where: { id: coachId }, select: { name: true, displayName: true } });
    const display = coach.displayName ?? coach.name;
    const base = slugify(display).padEnd(SLUG_LIMITS.min, 'x');
    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = attempt === 0 ? '' : `-${Math.random().toString(36).slice(2, 6)}`;
      const slug = `${base.slice(0, SLUG_LIMITS.max - suffix.length)}${suffix}`.replace(/-+$/, '');
      try {
        return await this.prisma.coachBrand.create({
          data: { coachId, slug, headline: `Train with ${display}`, intro: 'Tell me about your training and goals. I read every application.' },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          // A concurrent first read may have created this coach's brand; use it.
          const raced = await this.prisma.coachBrand.findUnique({ where: { coachId } });
          if (raced) return raced;
          continue;
        }
        throw err;
      }
    }
    throw new ConflictException('Could not reserve an application link. Try again.');
  }
}
