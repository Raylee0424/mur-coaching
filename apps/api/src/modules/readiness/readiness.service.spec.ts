import { randomBytes } from 'node:crypto';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { cyclePhase, readinessScore, summarizeCycle } from '@coaching/shared';
import { CycleCipher } from './cycle-cipher';
import { ReadinessService } from './readiness.service';

const KEY = randomBytes(32).toString('base64');
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

function setup(key: string | null = KEY) {
  const rows: Record<string, unknown>[] = [];
  const prisma = {
    readinessSurvey: { upsert: vi.fn().mockImplementation(({ create }) => ({ ...create, id: 'r1', updatedAt: new Date() })) },
    cycleLog: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation(({ create }) => rows.push({ ...create, id: `c${rows.length}`, updatedAt: new Date() })),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(rows.filter((r) => !where.sharedWithCoach || r.sharedWithCoach))),
      updateMany: vi.fn().mockImplementation(({ data }) => rows.forEach((r) => Object.assign(r, data))),
    },
  };
  const env = { get: vi.fn().mockReturnValue(key ?? undefined) };
  return { prisma, rows, service: new ReadinessService(prisma as never, env as never) };
}

describe('CycleCipher', () => {
  const c = new CycleCipher(KEY);

  it('round-trips with a fresh IV each time', () => {
    const a = c.encrypt('{"x":1}', 'cycle:k1:2026-01-01');
    expect(a).not.toBe(c.encrypt('{"x":1}', 'cycle:k1:2026-01-01'));
    expect(c.decrypt(a, 'cycle:k1:2026-01-01')).toBe('{"x":1}');
  });

  it('rejects another row, a tampered token or another key', () => {
    const t = c.encrypt('secret', 'cycle:k1:2026-01-01');
    expect(() => c.decrypt(t, 'cycle:k2:2026-01-01')).toThrow();
    const [iv, tag, data] = t.split('.');
    const flipped = Buffer.from(data!, 'base64');
    flipped[0] = flipped[0]! ^ 1;
    expect(() => c.decrypt([iv, tag, flipped.toString('base64')].join('.'), 'cycle:k1:2026-01-01')).toThrow();
    expect(() => new CycleCipher(randomBytes(32).toString('base64')).decrypt(t, 'cycle:k1:2026-01-01')).toThrow();
  });
});

describe('ReadinessService cycle privacy', () => {
  it('stores only ciphertext', async () => {
    const { service, rows } = setup();
    await service.saveCycleEntry('k1', { date: today, periodStart: true, cycleLengthDays: 30, symptoms: ['CRAMPS'], note: 'private words' });
    expect(JSON.stringify(rows[0])).not.toMatch(/CRAMPS|private words|periodStart/);
    expect(rows[0]).toMatchObject({ sharedWithCoach: false });
  });

  it('gives the owner decrypted entries and a summary', async () => {
    const { service } = setup();
    await service.saveCycleEntry('k1', { date: daysAgo(13), periodStart: true, cycleLengthDays: 28, symptoms: [], note: null });
    const ctx = await service.cycle('k1');
    expect(ctx).toMatchObject({ configured: true, sharedWithCoach: false, summary: { phase: 'OVULATORY', dayOfCycle: 14 } });
    expect(ctx.entries[0]).toMatchObject({ periodStart: true, cycleLengthDays: 28 });
  });

  it('refuses the coach until shared, then returns phase and day only', async () => {
    const { service } = setup();
    await service.saveCycleEntry('k1', { date: daysAgo(2), periodStart: true, cycleLengthDays: 28, symptoms: ['FATIGUE'], note: 'hidden' });
    await expect(service.coachCycleSummary('k1')).rejects.toBeInstanceOf(ForbiddenException);
    await service.setCycleSharing('k1', true);
    expect(await service.coachCycleSummary('k1')).toEqual({ phase: 'MENSTRUAL', dayOfCycle: 3 });
  });

  it('answers 503 without a key but still reports unconfigured to the owner', async () => {
    const { service } = setup(null);
    await expect(service.saveCycleEntry('k1', { date: today, periodStart: true, symptoms: [] })).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.coachCycleSummary('k1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(await service.cycle('k1')).toEqual({ configured: false, sharedWithCoach: false, summary: null, entries: [] });
  });
});

describe('readiness', () => {
  it('computes the score server-side, ignoring any client value', async () => {
    const { service, prisma } = setup();
    const r = await service.saveReadiness('k1', { date: today, sleepQuality: 5, sleepHours: 8, soreness: 1, stress: 1, motivation: 5, score: 3 } as never);
    expect(r.score).toBe(100);
    expect(prisma.readinessSurvey.upsert.mock.calls[0]![0].create.score).toBe(100);
  });

  it('weights the inputs', () => {
    expect(readinessScore({ sleepQuality: 1, sleepHours: 4, soreness: 5, stress: 5, motivation: 1 })).toBe(0);
    expect(readinessScore({ sleepQuality: 3, soreness: 3, stress: 3, motivation: 3 })).toBe(50);
    expect(readinessScore({ sleepQuality: 4, sleepHours: 7.6, soreness: 2, stress: 3, motivation: 5 })).toBe(75);
  });
});

describe('cycle math', () => {
  it('maps cycle days to phases around length − 14', () => {
    expect([1, 5, 6, 12, 13, 14, 15, 16, 28].map((d) => cyclePhase(d, 28))).toEqual([
      'MENSTRUAL', 'MENSTRUAL', 'FOLLICULAR', 'FOLLICULAR', 'OVULATORY', 'OVULATORY', 'OVULATORY', 'LUTEAL', 'LUTEAL',
    ]);
    expect(cyclePhase(19, 35)).toBe('FOLLICULAR');
  });

  it('summarizes from the latest start on or before today and flags overdue', () => {
    const s = summarizeCycle(
      [
        { date: '2026-01-01', periodStart: true, cycleLengthDays: 30 },
        { date: '2026-02-05', periodStart: true, cycleLengthDays: null },
        { date: '2026-03-30', periodStart: true, cycleLengthDays: 28 },
      ],
      '2026-03-10',
    );
    expect(s).toEqual({ phase: 'LUTEAL', dayOfCycle: 34, cycleLengthDays: 30, overdue: true });
    expect(summarizeCycle([], '2026-03-10')).toBeNull();
  });
});
