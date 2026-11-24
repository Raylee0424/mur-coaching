import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ProgressPhoto } from '@prisma/client';
import { BODY_LIMITS } from '@coaching/shared';
import type {
  BodyTrendDto,
  BodyweightPointDto,
  ClientPhotosDto,
  CoachProgressDto,
  CreateProgressPhotoRequest,
  CreateProgressPhotoResponse,
  ProgressPhotoDto,
  SaveBodyGoalRequest,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { scanJpegHeader } from '../storage/jpeg-metadata';
import { StorageService } from '../storage/storage.service';

const DAY_MS = 86_400_000;
const day = (d: Date): string => d.toISOString().slice(0, 10);
const asDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
/** JPEG header bytes read back to prove no metadata segment survived. */
const HEADER_SAMPLE = 64 * 1024;

/** Real calendar date, not after tomorrow (UTC; covers clients east of UTC). */
function pastDate(iso: string, label: string): Date {
  const d = asDate(iso);
  if (Number.isNaN(d.getTime()) || day(d) !== iso) throw new BadRequestException(`${label} is not a real date.`);
  if (d.getTime() > Date.now() + DAY_MS) throw new BadRequestException(`${label} is in the future.`);
  return d;
}

function kg(value: string): string {
  const n = Number(value);
  if (n < BODY_LIMITS.minKg || n > BODY_LIMITS.maxKg) throw new BadRequestException(`Weight must be between ${BODY_LIMITS.minKg} and ${BODY_LIMITS.maxKg} kg.`);
  return value;
}

@Injectable()
export class BodyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private entries(clientId: string): Promise<BodyweightPointDto[]> {
    return this.prisma.bodyweightEntry
      .findMany({
        where: { clientId, date: { gte: new Date(Date.now() - BODY_LIMITS.historyDays * DAY_MS) } },
        orderBy: { date: 'asc' },
        select: { date: true, weightKg: true },
      })
      .then((rows) => rows.map((r) => ({ date: day(r.date), weightKg: r.weightKg.toString() })));
  }

  // ─── Bodyweight ───

  async trend(clientId: string): Promise<BodyTrendDto> {
    const [entries, goal] = await Promise.all([this.entries(clientId), this.prisma.bodyGoal.findUnique({ where: { clientId } })]);
    return { entries, goal: goal && { targetKg: goal.targetKg.toString(), targetDate: goal.targetDate ? day(goal.targetDate) : null } };
  }

  /** One entry per day: logging the same date again replaces it. */
  async log(clientId: string, date: string, weightKg: string): Promise<void> {
    const at = pastDate(date, 'The date');
    const value = kg(weightKg);
    await this.prisma.bodyweightEntry.upsert({
      where: { clientId_date: { clientId, date: at } },
      create: { clientId, date: at, weightKg: value },
      update: { weightKg: value },
    });
  }

  async removeEntry(clientId: string, date: string): Promise<void> {
    const at = asDate(date);
    if (Number.isNaN(at.getTime())) throw new NotFoundException('Entry not found');
    const { count } = await this.prisma.bodyweightEntry.deleteMany({ where: { clientId, date: at } });
    if (!count) throw new NotFoundException('Entry not found');
  }

  async saveGoal(clientId: string, input: SaveBodyGoalRequest): Promise<void> {
    const targetKg = kg(input.targetKg);
    let targetDate: Date | null = null;
    if (input.targetDate) {
      targetDate = asDate(input.targetDate);
      if (Number.isNaN(targetDate.getTime()) || day(targetDate) !== input.targetDate) throw new BadRequestException('The goal date is not a real date.');
    }
    await this.prisma.bodyGoal.upsert({ where: { clientId }, create: { clientId, targetKg, targetDate }, update: { targetKg, targetDate } });
  }

  async removeGoal(clientId: string): Promise<void> {
    await this.prisma.bodyGoal.deleteMany({ where: { clientId } });
  }

  // ─── Progress photos ───

  private toPhoto(p: ProgressPhoto): ProgressPhotoDto {
    return { id: p.id, pose: p.pose, takenOn: day(p.takenOn), sharedWithCoach: p.sharedWithCoach, url: this.storage.readUrl(p.storageKey) };
  }

  private listed(where: { clientId: string; sharedWithCoach?: true }): Promise<ProgressPhoto[]> {
    return this.prisma.progressPhoto.findMany({ where: { ...where, uploadedAt: { not: null } }, orderBy: [{ takenOn: 'asc' }, { createdAt: 'asc' }] });
  }

  async photos(clientId: string): Promise<ClientPhotosDto> {
    if (!this.storage.configured) return { storageConfigured: false, photos: [] };
    return { storageConfigured: true, photos: (await this.listed({ clientId })).map((p) => this.toPhoto(p)) };
  }

  /** Step 1: reserve a hidden row and sign a JPEG-only PUT. */
  async reservePhoto(clientId: string, input: CreateProgressPhotoRequest): Promise<CreateProgressPhotoResponse> {
    if (!this.storage.configured) throw new ServiceUnavailableException('Photo storage is not configured on this server.');
    const takenOn = pastDate(input.takenOn, 'The photo date');
    const storageKey = `clients/${clientId}/photos/${randomUUID()}.jpg`;
    const row = await this.prisma.progressPhoto.create({
      data: { clientId, pose: input.pose, takenOn, sizeBytes: input.sizeBytes, storageKey, sharedWithCoach: input.sharedWithCoach },
    });
    const upload = this.storage.uploadUrl(storageKey, BODY_LIMITS.photoContentType);
    return { id: row.id, uploadUrl: upload.url, uploadHeaders: upload.headers };
  }

  /**
   * Step 2: the object must match the declared size and be a JPEG with no EXIF, XMP, IPTC or comment segment.
   * Anything else is deleted, row and object, so an unstripped photo is never listed.
   */
  async completePhoto(clientId: string, id: string): Promise<void> {
    const row = await this.prisma.progressPhoto.findFirst({ where: { id, clientId } });
    if (!row) throw new NotFoundException('Photo not found');
    if (row.uploadedAt) return;
    const discard = async (message: string): Promise<never> => {
      await this.prisma.progressPhoto.deleteMany({ where: { id, clientId, uploadedAt: null } });
      await this.storage.remove(row.storageKey);
      throw new ConflictException(message);
    };
    const stored = await this.storage.size(row.storageKey);
    if (stored === null) return discard('The upload did not arrive. Try again.');
    if (stored !== row.sizeBytes) return discard('The uploaded photo does not match the size you selected. Try again.');
    const head = await this.storage.head(row.storageKey, Math.min(HEADER_SAMPLE, stored));
    const scan = head ? scanJpegHeader(head) : 'not-jpeg';
    if (scan !== 'clean') return discard(scan === 'metadata' ? 'The photo still carries metadata. Upload it again from this page.' : 'That file is not a usable JPEG photo.');
    await this.prisma.progressPhoto.update({ where: { id }, data: { uploadedAt: new Date() } });
  }

  async sharePhoto(clientId: string, id: string, sharedWithCoach: boolean): Promise<void> {
    const { count } = await this.prisma.progressPhoto.updateMany({ where: { id, clientId, uploadedAt: { not: null } }, data: { sharedWithCoach } });
    if (!count) throw new NotFoundException('Photo not found');
  }

  /** Hard delete: the row and the stored object. */
  async deletePhoto(clientId: string, id: string): Promise<void> {
    const row = await this.prisma.progressPhoto.findFirst({ where: { id, clientId }, select: { storageKey: true } });
    if (!row) throw new NotFoundException('Photo not found');
    await this.prisma.progressPhoto.delete({ where: { id } });
    await this.storage.remove(row.storageKey);
  }

  // ─── Coach (caller enforces tenancy) ───

  async coachProgress(clientId: string): Promise<CoachProgressDto> {
    const [client, entries, photos] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: clientId }, select: { name: true, displayName: true } }),
      this.entries(clientId),
      this.storage.configured ? this.listed({ clientId, sharedWithCoach: true }) : Promise.resolve([]),
    ]);
    return { clientName: client.displayName ?? client.name, entries, photos: photos.map((p) => this.toPhoto(p)) };
  }
}
