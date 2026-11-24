import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { CycleLog, ReadinessSurvey } from '@prisma/client';
import { CYCLE_LIMITS, READINESS_LIMITS, readinessScore, summarizeCycle } from '@coaching/shared';
import type {
  CoachCycleSummaryDto,
  CycleContextDto,
  CycleEntryDto,
  ReadinessDto,
  ReadinessHistoryDto,
  SaveCycleEntryRequest,
  SaveReadinessRequest,
} from '@coaching/shared';
import { EnvService } from '../../config/env.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CycleCipher } from './cycle-cipher';

const DAY_MS = 86_400_000;
const day = (d: Date): string => d.toISOString().slice(0, 10);
const asDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const today = (): string => day(new Date());

/** Real date, not after tomorrow (UTC; covers clients east of UTC). */
function pastDate(iso: string): Date {
  const d = asDate(iso);
  if (Number.isNaN(d.getTime()) || day(d) !== iso) throw new BadRequestException('The date is not a real date.');
  if (d.getTime() > Date.now() + DAY_MS) throw new BadRequestException('The date is in the future.');
  return d;
}

/** Encrypted fields: everything about the day except its date and share flag. */
type CyclePayload = Omit<CycleEntryDto, 'date'>;

@Injectable()
export class ReadinessService {
  private readonly logger = new Logger(ReadinessService.name);
  private readonly cipher: CycleCipher | null;

  constructor(
    private readonly prisma: PrismaService,
    env: EnvService,
  ) {
    const key = env.get('CYCLE_ENCRYPTION_KEY');
    this.cipher = key ? new CycleCipher(key) : null;
  }

  // ─── Readiness (owner) ───

  private toReadiness(r: ReadinessSurvey): ReadinessDto {
    return {
      date: day(r.date),
      sleepQuality: r.sleepQuality,
      sleepHours: r.sleepHours?.toString() ?? null,
      soreness: r.soreness,
      stress: r.stress,
      motivation: r.motivation,
      score: r.score,
      note: r.note,
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async readiness(clientId: string): Promise<ReadinessHistoryDto> {
    const rows = await this.prisma.readinessSurvey.findMany({
      where: { clientId, date: { gte: new Date(Date.now() - READINESS_LIMITS.historyDays * DAY_MS) } },
      orderBy: { date: 'desc' },
    });
    const recent = rows.map((r) => this.toReadiness(r));
    return { today: recent.find((r) => r.date === today()) ?? null, recent };
  }

  /** One survey per day; resubmitting replaces it. The score is computed here, never trusted from the client. */
  async saveReadiness(clientId: string, input: SaveReadinessRequest): Promise<ReadinessDto> {
    const date = pastDate(input.date);
    const data = {
      sleepQuality: input.sleepQuality,
      sleepHours: input.sleepHours ?? null,
      soreness: input.soreness,
      stress: input.stress,
      motivation: input.motivation,
      score: readinessScore(input),
      note: input.note || null,
    };
    const row = await this.prisma.readinessSurvey.upsert({ where: { clientId_date: { clientId, date } }, create: { clientId, date, ...data }, update: data });
    return this.toReadiness(row);
  }

  async deleteReadiness(clientId: string, date: string): Promise<void> {
    const { count } = await this.prisma.readinessSurvey.deleteMany({ where: { clientId, date: asDate(date) } });
    if (!count) throw new NotFoundException('Survey not found');
  }

  // ─── Cycle context (owner only; coaches get a phase summary when shared) ───

  private requireCipher(): CycleCipher {
    if (!this.cipher) throw new ServiceUnavailableException('Cycle logging is not configured on this server.');
    return this.cipher;
  }

  private aad(clientId: string, date: string): string {
    return `cycle:${clientId}:${date}`;
  }

  /** Rows that fail to decrypt (wrong key, tampering) are skipped and logged by id only, never by content. */
  private decryptAll(cipher: CycleCipher, rows: CycleLog[]): CycleEntryDto[] {
    const out: CycleEntryDto[] = [];
    for (const r of rows) {
      const date = day(r.date);
      try {
        const p = JSON.parse(cipher.decrypt(r.ciphertext, this.aad(r.clientId, date))) as CyclePayload;
        out.push({ date, periodStart: p.periodStart, cycleLengthDays: p.cycleLengthDays, symptoms: p.symptoms, note: p.note });
      } catch {
        this.logger.warn(`Cycle log ${r.id} could not be decrypted`);
      }
    }
    return out;
  }

  private recentRows(clientId: string, where: { sharedWithCoach?: true } = {}): Promise<CycleLog[]> {
    return this.prisma.cycleLog.findMany({
      where: { clientId, ...where, date: { gte: new Date(Date.now() - CYCLE_LIMITS.historyDays * DAY_MS) } },
      orderBy: { date: 'desc' },
    });
  }

  async cycle(clientId: string): Promise<CycleContextDto> {
    if (!this.cipher) return { configured: false, sharedWithCoach: false, summary: null, entries: [] };
    const rows = await this.recentRows(clientId);
    const entries = this.decryptAll(this.cipher, rows);
    return { configured: true, sharedWithCoach: rows[0]?.sharedWithCoach ?? false, summary: summarizeCycle(entries, today()), entries };
  }

  /** One row per day, replaced on resubmit. A new row inherits the client's current share choice. */
  async saveCycleEntry(clientId: string, input: SaveCycleEntryRequest): Promise<void> {
    const cipher = this.requireCipher();
    const date = pastDate(input.date);
    const payload: CyclePayload = {
      periodStart: input.periodStart,
      cycleLengthDays: input.periodStart ? (input.cycleLengthDays ?? null) : null,
      symptoms: [...new Set(input.symptoms)],
      note: input.note || null,
    };
    const ciphertext = cipher.encrypt(JSON.stringify(payload), this.aad(clientId, input.date));
    const latest = await this.prisma.cycleLog.findFirst({ where: { clientId }, orderBy: { updatedAt: 'desc' }, select: { sharedWithCoach: true } });
    await this.prisma.cycleLog.upsert({
      where: { clientId_date: { clientId, date } },
      create: { clientId, date, ciphertext, sharedWithCoach: latest?.sharedWithCoach ?? false },
      update: { ciphertext },
    });
  }

  async deleteCycleEntry(clientId: string, date: string): Promise<void> {
    const { count } = await this.prisma.cycleLog.deleteMany({ where: { clientId, date: asDate(date) } });
    if (!count) throw new NotFoundException('Entry not found');
  }

  /** The share switch applies to every cycle row the client has. */
  async setCycleSharing(clientId: string, sharedWithCoach: boolean): Promise<void> {
    this.requireCipher();
    await this.prisma.cycleLog.updateMany({ where: { clientId }, data: { sharedWithCoach } });
  }

  /**
   * Coach view (caller enforces tenancy). Only shared rows are read, and only phase + cycle day leave this method:
   * symptoms, notes and dates never do. 403 while the client has not shared.
   */
  async coachCycleSummary(clientId: string): Promise<CoachCycleSummaryDto> {
    const cipher = this.requireCipher();
    const rows = await this.recentRows(clientId, { sharedWithCoach: true });
    if (!rows.length) throw new ForbiddenException('This client has not shared cycle context.');
    const summary = summarizeCycle(this.decryptAll(cipher, rows), today());
    if (!summary) throw new ForbiddenException('This client has not shared a current cycle phase.');
    return { phase: summary.phase, dayOfCycle: summary.dayOfCycle };
  }
}
