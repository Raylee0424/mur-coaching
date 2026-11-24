import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { angleDegrees, validateShapes } from '@coaching/shared';
import { VideosService } from './videos.service';

const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

function setup(head: Uint8Array, size = 1000) {
  const media = { id: 'm1', storageKey: 'k', sizeBytes: 1000, contentType: 'video/webm', uploadedAt: null };
  const prisma = {
    setVideo: { findFirst: vi.fn().mockResolvedValue({ id: 'v1', mediaId: 'm1', media }) },
    mediaAsset: { update: vi.fn(), deleteMany: vi.fn() },
    coachClient: { findUnique: vi.fn().mockResolvedValue(null) },
    formReview: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
  };
  const storage = { configured: true, size: vi.fn().mockResolvedValue(size), head: vi.fn().mockResolvedValue(head), remove: vi.fn(), readUrl: vi.fn(), uploadUrl: vi.fn() };
  return { prisma, storage, service: new VideosService(prisma as never, storage as never) };
}

describe('VideosService', () => {
  it('lists a clip whose size and signature match', async () => {
    const { service, prisma } = setup(WEBM);
    await service.completeVideo('k1', 'v1');
    expect(prisma.mediaAsset.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { uploadedAt: expect.any(Date) } });
  });

  it('deletes asset and object when the bytes are not the declared type', async () => {
    const { service, prisma, storage } = setup(JPEG);
    await expect(service.completeVideo('k1', 'v1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.mediaAsset.deleteMany).toHaveBeenCalledWith({ where: { id: 'm1' } });
    expect(storage.remove).toHaveBeenCalledWith('k');
    expect(prisma.mediaAsset.update).not.toHaveBeenCalled();
  });

  it('refuses a form check without an active coach', async () => {
    const { service, prisma } = setup(WEBM);
    prisma.setVideo.findFirst.mockResolvedValue({ id: 'v1', review: null });
    await expect(service.requestReview('k1', 'v1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.formReview.create).not.toHaveBeenCalled();
  });

  it('hides another coach’s review as 404', async () => {
    const { service } = setup(WEBM);
    await expect(service.addAnnotation('c2', 'r1', { timestampMs: 0, shapes: [] })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('annotation shapes', () => {
  it('validates geometry', () => {
    expect(validateShapes([{ kind: 'ARROW', points: [[0.1, 0.1], [0.5, 0.5]] }])).toBeNull();
    expect(validateShapes([])).toMatch(/at least one/);
    expect(validateShapes([{ kind: 'ANGLE', points: [[0, 0], [1, 1]] }])).toMatch(/three/);
    expect(validateShapes([{ kind: 'ARROW', points: [[0, 0], [1.2, 0.5]] }])).toMatch(/inside/);
    expect(validateShapes([{ kind: 'CIRCLE', points: [] }])).toMatch(/malformed/);
  });

  it('measures angles in pixels', () => {
    expect(angleDegrees([1, 0.5], [0.5, 0.5], [0.5, 0])).toBe(90);
    expect(angleDegrees([0, 0], [0.5, 0.5], [1, 1])).toBe(180);
    // 45° in unit space is not 45° on a 16:9 frame.
    expect(angleDegrees([1, 0], [0, 0], [1, 1], 1920, 1080)).toBe(29);
  });
});
