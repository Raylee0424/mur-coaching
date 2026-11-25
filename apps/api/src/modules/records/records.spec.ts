import { describe, expect, it } from 'vitest';
import { bestRecord, bracketCells, computeRecords, countRecent, netDelta, windowSummary, type RecordSetInput, type SessionPoint } from './records';

const d = (day: number) => new Date(Date.UTC(2026, 10, day));
const set = (id: string, reps: number, weightKg: number, day = 1, extra: Partial<RecordSetInput> = {}): RecordSetInput => ({
  setLogId: id, reps, weightKg, rpe: null, isWarmup: false, performedAt: d(day), ...extra,
});

describe('computeRecords', () => {
  it('keeps the heaviest working set per exact rep count', () => {
    const rows = computeRecords([set('a', 5, 100), set('b', 5, 105, 3), set('c', 3, 110), set('d', 5, 102.5, 4)]);
    expect(rows.map((r) => [r.reps, r.weightKg, r.setLogId])).toEqual([[3, 110, 'c'], [5, 105, 'b']]);
  });

  it('ignores warm-ups, zero reps and zero load', () => {
    const rows = computeRecords([set('w', 5, 200, 1, { isWarmup: true }), set('z', 0, 100), set('l', 5, 0), set('ok', 5, 90)]);
    expect(rows.map((r) => r.setLogId)).toEqual(['ok']);
  });

  it('gives a tie to the earliest session, then the lower set id', () => {
    expect(computeRecords([set('late', 5, 100, 9), set('early', 5, 100, 2)])[0]?.setLogId).toBe('early');
    expect(computeRecords([set('b', 5, 100, 2), set('a', 5, 100, 2)])[0]?.setLogId).toBe('a');
  });

  it('is rebuildable: dropping the record set promotes the next best', () => {
    const all = [set('a', 5, 100), set('b', 5, 105, 3)];
    expect(computeRecords(all)[0]?.setLogId).toBe('b');
    expect(computeRecords(all.filter((s) => s.setLogId !== 'b'))[0]?.setLogId).toBe('a');
    expect(computeRecords([])).toEqual([]);
  });

  it('applies Epley to e1RM and treats a single as its own max', () => {
    const rows = computeRecords([set('s', 1, 180), set('t', 3, 150)]);
    expect(rows.map((r) => r.e1rmKg)).toEqual([180, 165]);
  });
});

describe('bracketCells', () => {
  const rows = computeRecords([set('a', 3, 170), set('b', 5, 150), set('c', 10, 120)]);
  const cells = bracketCells(rows, [1, 3, 5, 8, 10, 15]);

  it('lets a heavier set at more reps fill lighter brackets', () => {
    expect(cells.map((c) => c?.record.weightKg ?? null)).toEqual([170, 170, 150, 120, 120, null]);
  });

  it('reports the set that holds the bracket', () => {
    expect(cells[3]?.record.reps).toBe(10);
  });
});

describe('countRecent', () => {
  it('counts only records inside the window', () => {
    const rows = computeRecords([set('a', 5, 100, 1), set('b', 3, 110, 20), set('c', 1, 120, 24)]);
    expect(countRecent(rows, d(24), 7)).toBe(2);
    expect(countRecent(rows, d(24), 30)).toBe(3);
  });
});

describe('netDelta', () => {
  it('needs two points', () => {
    expect(netDelta([{ e1rmKg: 100 }])).toBeNull();
  });

  it('is first to last', () => {
    expect(netDelta([{ e1rmKg: 172.5 }, { e1rmKg: 190 }, { e1rmKg: 184 }])).toEqual({ kg: 11.5, pct: 6.7 });
  });
});

describe('windowSummary', () => {
  const point = (day: number, e1rmKg: number, workingSets: number, avgRpe: number | null): SessionPoint => ({
    logId: `l${day}`, performedAt: d(day).toISOString(), e1rmKg, topWeightKg: 100, topSetReps: 5, workingSets, avgRpe,
  });

  it('sums sets, averages RPE and deltas inside the window only', () => {
    const s = windowSummary([point(1, 150, 4, 9), point(15, 160, 3, 8), point(20, 165, 3, null)], d(24), 14);
    expect(s).toEqual({ sets: 6, avgRpe: 8, netDeltaPct: 3.1 });
  });

  it('is empty-safe', () => {
    expect(windowSummary([], d(24))).toEqual({ sets: 0, avgRpe: null, netDeltaPct: null });
  });
});

describe('bestRecord', () => {
  it('picks the highest e1RM, earlier record on a tie', () => {
    const row = (id: string, e1rmKg: number, day: number) => ({ setLogId: id, reps: 5, weightKg: 100, e1rmKg, achievedAt: d(day) });
    expect(bestRecord([row('a', 110, 5), row('b', 120, 9), row('c', 120, 3)]).setLogId).toBe('c');
  });
});
