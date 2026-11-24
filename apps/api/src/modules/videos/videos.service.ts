import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FormReviewStatus, MediaKind, Prisma } from '@prisma/client';
import { MEDIA_LIMITS, validateShapes } from '@coaching/shared';
import type {
  AnnotationShape,
  ClientVideosDto,
  CreateAnnotationRequest,
  CreateReviewAudioRequest,
  CreateSetVideoRequest,
  FormCheckDto,
  FormCheckQueueDto,
  FormReviewDto,
  SetVideoDto,
  UploadTicketDto,
  VideoAnnotationDto,
  VideoSide,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES, isAccessibleLink } from '../clients/link-status';
import { sniffMedia } from '../storage/media-sniff';
import { StorageService } from '../storage/storage.service';

const DAY_MS = 86_400_000;
const SIGNATURE_BYTES = 16;
const REVIEWED_SHOWN = 20;
const EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
};

const videoInclude = {
  media: true,
  setLog: {
    select: {
      setNumber: true,
      reps: true,
      weightKg: true,
      rpe: true,
      rir: true,
      exerciseLog: { select: { exercise: { select: { name: true } }, workoutLog: { select: { performedAt: true } } } },
    },
  },
} satisfies Prisma.SetVideoInclude;
type VideoRow = Prisma.SetVideoGetPayload<{ include: typeof videoInclude }>;

const reviewInclude = {
  audio: true,
  annotations: { orderBy: { timestampMs: 'asc' } },
} satisfies Prisma.FormReviewInclude;
type ReviewRow = Prisma.FormReviewGetPayload<{ include: typeof reviewInclude }>;

const name = (u: { name: string; displayName: string | null }): string => u.displayName ?? u.name;

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ─── Mapping ───

  private toVideo(v: VideoRow): Omit<SetVideoDto, 'review'> {
    return {
      id: v.id,
      setLogId: v.setLogId,
      side: v.side,
      exerciseName: v.setLog.exerciseLog.exercise.name,
      performedAt: v.setLog.exerciseLog.workoutLog.performedAt.toISOString(),
      setNumber: v.setLog.setNumber,
      reps: v.setLog.reps,
      weightKg: v.setLog.weightKg.toString(),
      rpe: v.setLog.rpe?.toString() ?? null,
      rir: v.setLog.rir,
      contentType: v.media.contentType,
      url: this.storage.readUrl(v.media.storageKey),
      createdAt: v.createdAt.toISOString(),
    };
  }

  private toReview(r: ReviewRow): FormReviewDto {
    return {
      id: r.id,
      status: r.status,
      summary: r.summary,
      requestedAt: r.requestedAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      audioUrl: r.audio?.uploadedAt ? this.storage.readUrl(r.audio.storageKey) : null,
      annotations: r.annotations.map((a) => this.toAnnotation(a)),
    };
  }

  private toAnnotation(a: { id: string; timestampMs: number; shapes: Prisma.JsonValue; note: string | null }): VideoAnnotationDto {
    return { id: a.id, timestampMs: a.timestampMs, shapes: a.shapes as unknown as AnnotationShape[], note: a.note };
  }

  // ─── Shared upload steps ───

  private requireStorage(): void {
    if (!this.storage.configured) throw new ServiceUnavailableException('Video storage is not configured on this server.');
  }

  private async reserveAsset(ownerId: string, kind: MediaKind, contentType: string, sizeBytes: number, folder: string) {
    const storageKey = `${folder}/${randomUUID()}.${EXTENSIONS[contentType] ?? 'bin'}`;
    const asset = await this.prisma.mediaAsset.create({ data: { ownerId, kind, contentType, sizeBytes, storageKey } });
    return { asset, upload: this.storage.uploadUrl(storageKey, contentType) };
  }

  /** Size and file signature must match what was reserved; anything else is a 409 and the caller discards. */
  private async verifyAsset(asset: { storageKey: string; sizeBytes: number; contentType: string }): Promise<string | null> {
    const stored = await this.storage.size(asset.storageKey);
    if (stored === null) return 'The upload did not arrive. Try again.';
    if (stored !== asset.sizeBytes) return 'The uploaded file does not match the size you selected. Try again.';
    const head = await this.storage.head(asset.storageKey, Math.min(SIGNATURE_BYTES, stored));
    if (!head || !sniffMedia(head, asset.contentType)) return 'That file is not the video or audio type it claims to be.';
    return null;
  }

  private async deleteAsset(asset: { id: string; storageKey: string }): Promise<void> {
    await this.prisma.mediaAsset.deleteMany({ where: { id: asset.id } });
    await this.storage.remove(asset.storageKey);
  }

  // ─── Client: set videos ───

  async clientVideos(clientId: string): Promise<ClientVideosDto> {
    const link = await this.prisma.coachClient.findUnique({ where: { clientId }, select: { status: true } });
    const hasCoach = isAccessibleLink(link?.status);
    if (!this.storage.configured) return { storageConfigured: false, hasCoach, videos: [], recentSets: [] };
    const [videos, sets] = await Promise.all([
      this.prisma.setVideo.findMany({
        where: { clientId, media: { uploadedAt: { not: null } } },
        include: { ...videoInclude, review: { include: reviewInclude } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.setLog.findMany({
        where: { isWarmup: false, exerciseLog: { workoutLog: { clientId, performedAt: { gte: new Date(Date.now() - MEDIA_LIMITS.recentSetDays * DAY_MS) } } } },
        select: {
          id: true,
          setNumber: true,
          reps: true,
          weightKg: true,
          exerciseLog: { select: { exercise: { select: { name: true } }, workoutLog: { select: { performedAt: true } } } },
          videos: { where: { media: { uploadedAt: { not: null } } }, select: { side: true } },
        },
        orderBy: [{ exerciseLog: { workoutLog: { performedAt: 'desc' } } }, { exerciseLog: { order: 'asc' } }, { setNumber: 'asc' }],
        take: 80,
      }),
    ]);
    return {
      storageConfigured: true,
      hasCoach,
      videos: videos.map((v) => ({ ...this.toVideo(v), review: v.review ? this.toReview(v.review) : null })),
      recentSets: sets.map((s) => ({
        setLogId: s.id,
        exerciseName: s.exerciseLog.exercise.name,
        performedAt: s.exerciseLog.workoutLog.performedAt.toISOString(),
        setNumber: s.setNumber,
        reps: s.reps,
        weightKg: s.weightKg.toString(),
        taken: s.videos.map((v) => v.side as VideoSide),
      })),
    };
  }

  /** Step 1: the set must be the client's own; one clip per set and side. */
  async reserveVideo(clientId: string, input: CreateSetVideoRequest): Promise<UploadTicketDto> {
    this.requireStorage();
    const set = await this.prisma.setLog.findFirst({ where: { id: input.setLogId, exerciseLog: { workoutLog: { clientId } } }, select: { id: true } });
    if (!set) throw new NotFoundException('Set not found');
    const existing = await this.prisma.setVideo.findUnique({ where: { setLogId_side: { setLogId: set.id, side: input.side } }, include: { media: true } });
    if (existing?.media.uploadedAt) throw new ConflictException('That set already has a clip for this side. Delete it first.');
    // A reserved but never confirmed clip for this slot is abandoned: replace it.
    if (existing) await this.deleteAsset(existing.media);
    const { asset, upload } = await this.reserveAsset(clientId, MediaKind.VIDEO, input.contentType, input.sizeBytes, `clients/${clientId}/videos`);
    const video = await this.prisma.setVideo.create({ data: { setLogId: set.id, clientId, side: input.side, mediaId: asset.id } }).catch(async (err: unknown) => {
      await this.deleteAsset(asset);
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new ConflictException('That set already has a clip for this side.');
      throw err;
    });
    return { id: video.id, uploadUrl: upload.url, uploadHeaders: upload.headers };
  }

  /** Step 2: list the clip only once the stored object checks out; otherwise delete row and object. */
  async completeVideo(clientId: string, id: string): Promise<void> {
    const video = await this.prisma.setVideo.findFirst({ where: { id, clientId }, include: { media: true } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.media.uploadedAt) return;
    const problem = await this.verifyAsset(video.media);
    if (problem) {
      await this.deleteAsset(video.media); // cascades to the SetVideo row
      throw new ConflictException(problem);
    }
    await this.prisma.mediaAsset.update({ where: { id: video.mediaId }, data: { uploadedAt: new Date() } });
  }

  /** Hard delete: clip, its review, and the narration object. */
  async deleteVideo(clientId: string, id: string): Promise<void> {
    const video = await this.prisma.setVideo.findFirst({ where: { id, clientId }, include: { media: true, review: { include: { audio: true } } } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.review?.audio) await this.deleteAsset(video.review.audio);
    await this.deleteAsset(video.media);
  }

  /** Sends a clip to the client's current coach. One review per clip. */
  async requestReview(clientId: string, id: string): Promise<void> {
    const video = await this.prisma.setVideo.findFirst({ where: { id, clientId, media: { uploadedAt: { not: null } } }, select: { id: true, review: { select: { id: true } } } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.review) throw new ConflictException('This clip is already with your coach.');
    const link = await this.prisma.coachClient.findUnique({ where: { clientId }, select: { coachId: true, status: true } });
    if (!link || !isAccessibleLink(link.status)) throw new BadRequestException('You need an active coach to request a form check.');
    await this.prisma.formReview.create({ data: { setVideoId: video.id, clientId, coachId: link.coachId } });
  }

  // ─── Coach: form-check queue ───

  /** Tenancy: the review is the coach's and the client is still on their accessible roster; else 404. */
  private async ownedReview(coachId: string, reviewId: string) {
    const review = await this.prisma.formReview.findFirst({
      where: { id: reviewId, coachId, client: { coachLink: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } } },
      include: { audio: true },
    });
    if (!review) throw new NotFoundException('Form check not found');
    return review;
  }

  async queue(coachId: string): Promise<FormCheckQueueDto> {
    if (!this.storage.configured) return { storageConfigured: false, pending: [], reviewed: [], avgTurnaroundHours: null };
    const where = { coachId, client: { coachLink: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } }, setVideo: { media: { uploadedAt: { not: null } } } };
    const include = { ...reviewInclude, client: { select: { name: true, displayName: true } }, setVideo: { include: videoInclude } };
    const [pending, reviewed] = await Promise.all([
      this.prisma.formReview.findMany({ where: { ...where, status: FormReviewStatus.PENDING }, include, orderBy: { requestedAt: 'asc' } }),
      this.prisma.formReview.findMany({ where: { ...where, status: FormReviewStatus.REVIEWED }, include, orderBy: { reviewedAt: 'desc' }, take: REVIEWED_SHOWN }),
    ]);
    const toCheck = (r: (typeof pending)[number]): FormCheckDto => ({
      reviewId: r.id,
      clientId: r.clientId,
      clientName: name(r.client),
      video: this.toVideo(r.setVideo),
      review: this.toReview(r),
    });
    const hours = reviewed.filter((r) => r.reviewedAt).map((r) => (r.reviewedAt!.getTime() - r.requestedAt.getTime()) / 3_600_000);
    return {
      storageConfigured: true,
      pending: pending.map(toCheck),
      reviewed: reviewed.map(toCheck),
      avgTurnaroundHours: hours.length ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : null,
    };
  }

  async addAnnotation(coachId: string, reviewId: string, input: CreateAnnotationRequest): Promise<VideoAnnotationDto> {
    const review = await this.ownedReview(coachId, reviewId);
    const problem = validateShapes(input.shapes);
    if (problem) throw new BadRequestException(problem);
    const count = await this.prisma.videoAnnotation.count({ where: { reviewId: review.id } });
    if (count >= MEDIA_LIMITS.maxAnnotations) throw new BadRequestException(`A review holds at most ${MEDIA_LIMITS.maxAnnotations} annotations.`);
    const shapes = input.shapes.map((s) => ({ kind: s.kind, points: s.points.map(([x, y]) => [x, y]) }));
    const row = await this.prisma.videoAnnotation.create({
      data: { reviewId: review.id, timestampMs: input.timestampMs, shapes: shapes as unknown as Prisma.InputJsonValue, note: input.note || null },
    });
    return this.toAnnotation(row);
  }

  async removeAnnotation(coachId: string, reviewId: string, annotationId: string): Promise<void> {
    const review = await this.ownedReview(coachId, reviewId);
    const { count } = await this.prisma.videoAnnotation.deleteMany({ where: { id: annotationId, reviewId: review.id } });
    if (!count) throw new NotFoundException('Annotation not found');
  }

  /** Narration step 1. The asset stays unattached until step 2 checks it. */
  async reserveAudio(coachId: string, reviewId: string, input: CreateReviewAudioRequest): Promise<UploadTicketDto> {
    this.requireStorage();
    const review = await this.ownedReview(coachId, reviewId);
    const { asset, upload } = await this.reserveAsset(coachId, MediaKind.AUDIO, input.contentType, input.sizeBytes, `coaches/${coachId}/reviews/${review.id}`);
    return { id: asset.id, uploadUrl: upload.url, uploadHeaders: upload.headers };
  }

  /** Narration step 2: attach the checked recording, replacing (and deleting) any earlier one. */
  async completeAudio(coachId: string, reviewId: string, assetId: string): Promise<void> {
    const review = await this.ownedReview(coachId, reviewId);
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, ownerId: coachId, kind: MediaKind.AUDIO, uploadedAt: null, reviewAudio: null } });
    if (!asset) throw new NotFoundException('Recording not found');
    const problem = await this.verifyAsset(asset);
    if (problem) {
      await this.deleteAsset(asset);
      throw new ConflictException(problem);
    }
    await this.prisma.$transaction([
      this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { uploadedAt: new Date() } }),
      this.prisma.formReview.update({ where: { id: review.id }, data: { audioMediaId: asset.id } }),
    ]);
    if (review.audio) await this.deleteAsset(review.audio);
  }

  /** Marks the review sent. Needs a written cue, a drawing or a narration. Re-sending updates the summary. */
  async submit(coachId: string, reviewId: string, summary: string): Promise<void> {
    const review = await this.ownedReview(coachId, reviewId);
    const annotations = await this.prisma.videoAnnotation.count({ where: { reviewId: review.id } });
    if (!summary && !annotations && !review.audio?.uploadedAt) throw new BadRequestException('Add a written cue, a drawing or a narration before sending.');
    await this.prisma.formReview.update({
      where: { id: review.id },
      data: { summary: summary || null, status: FormReviewStatus.REVIEWED, reviewedAt: review.reviewedAt ?? new Date() },
    });
  }
}
