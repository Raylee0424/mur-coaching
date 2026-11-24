import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { summarizeBodyweight } from '@coaching/shared';
import { BodyService } from './body.service';

const JPEG_CLEAN = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, 0xff, 0xda, 0x00, 0x02]);
const JPEG_EXIF = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x04, 0x45, 0x78, 0xff, 0xda, 0x00, 0x02]);

function setup(head: Uint8Array | null = JPEG_CLEAN, size: number | null = 500) {
  const row = { id: 'p1', clientId: 'k1', storageKey: 'key', sizeBytes: 500, uploadedAt: null };
  const prisma = {
    progressPhoto: { findFirst: vi.fn().mockResolvedValue(row), update: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    bodyweightEntry: { upsert: vi.fn() },
  };
  const storage = { configured: true, size: vi.fn().mockResolvedValue(size), head: vi.fn().mockResolvedValue(head), remove: vi.fn(), readUrl: vi.fn(), uploadUrl: vi.fn() };
  return { prisma, storage, service: new BodyService(prisma as never, storage as never) };
}

describe('BodyService photos', () => {
  it('lists a clean JPEG of the declared size', async () => {
    const { service, prisma } = setup();
    await service.completePhoto('k1', 'p1');
    expect(prisma.progressPhoto.update).toHaveBeenCalled();
  });

  it('deletes row and object when metadata survived or the size differs', async () => {
    for (const [head, size] of [[JPEG_EXIF, 500], [JPEG_CLEAN, 499]] as const) {
      const { service, prisma, storage } = setup(head, size);
      await expect(service.completePhoto('k1', 'p1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.progressPhoto.deleteMany).toHaveBeenCalledWith({ where: { id: 'p1', clientId: 'k1', uploadedAt: null } });
      expect(storage.remove).toHaveBeenCalledWith('key');
      expect(prisma.progressPhoto.update).not.toHaveBeenCalled();
    }
  });

  it('rejects impossible dates and weights before writing', async () => {
    const { service, prisma } = setup();
    await expect(service.log('k1', '2026-02-30', '80')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.log('k1', '2020-01-01', '9')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.bodyweightEntry.upsert).not.toHaveBeenCalled();
  });
});

describe('summarizeBodyweight', () => {
  const entries = [
    { date: '2026-11-10', weightKg: '70.00' }, // outside the 10-day window
    { date: '2026-11-14', weightKg: '68.90' },
    { date: '2026-11-18', weightKg: '68.40' },
    { date: '2026-11-20', weightKg: '67.70' },
    { date: '2026-11-23', weightKg: '68.00' },
    { date: '2026-11-30', weightKg: '50.00' }, // future: ignored
  ];

  it('computes the 7-day average, 10-day extremes and goal delta', () => {
    const s = summarizeBodyweight(entries, { targetKg: '67.50', targetDate: null }, '2026-11-23');
    expect(s.latest).toEqual({ date: '2026-11-23', kg: 68 });
    expect(s.rollingAvg7).toBe(68.03); // 18th, 20th, 23rd
    expect(s.high10).toEqual({ date: '2026-11-14', kg: 68.9 });
    expect(s.low10).toEqual({ date: '2026-11-20', kg: 67.7 });
    expect(s.goalDelta).toBe(0.5);
    expect(s.series).toHaveLength(5);
    expect(s.series[1]).toEqual({ date: '2026-11-14', kg: 68.9, avg7: 69.45 }); // with the 10th
  });

  it('is empty without entries', () => {
    expect(summarizeBodyweight([], null, '2026-11-23')).toMatchObject({ latest: null, rollingAvg7: null, high10: null, goalDelta: null, series: [] });
  });
});
