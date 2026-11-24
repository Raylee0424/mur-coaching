import { describe, expect, it } from 'vitest';
import type { Nutrients, NutritionTargetDto } from '@coaching/shared';
import { barWidth, dayStamp, dayTotals, groupBySlot, macroBars, macroKcal, microRows, microTone, pcf, shiftDate, slotForHour, waterTotal } from './nutrition-model';

const n = (kcal: string, proteinG: string, magnesiumMg: string | null = null): Nutrients =>
  ({ kcal, proteinG, carbsG: '10', fatG: '5', fiberG: '4', sodiumMg: '2600', potassiumMg: null, calciumMg: null, ironMg: null, magnesiumMg, vitaminDMcg: null }) as Nutrients;

const target: NutritionTargetDto = { kcal: 2000, proteinG: 150, carbsG: 200, fatG: 60, fiberG: 40, waterMl: 3000, setBy: 'COACH', setByName: 'Sam', updatedAt: '' };

describe('nutrition-model', () => {
  it('sums a day and builds the four target bars', () => {
    const totals = dayTotals([{ nutrients: n('1500', '120', '200') }, { nutrients: n('500', '30') }]);
    const bars = macroBars(totals, target);
    expect(bars.map((b) => [b.key, b.value, b.pct])).toEqual([
      ['kcal', 2000, 100],
      ['proteinG', 150, 100],
      ['carbsG', 20, 10],
      ['fatG', 10, 17],
    ]);
    expect(macroBars(totals, null)[0]).toMatchObject({ target: null, pct: null });
  });

  it('caps bar width at 0–100', () => {
    expect([barWidth(null), barWidth(140), barWidth(42)]).toEqual([0, 100, 42]);
  });

  it('uses the fiber target over the Daily Value and treats sodium as a ceiling', () => {
    const rows = microRows(dayTotals([{ nutrients: n('0', '0', '420') }]), target);
    expect(rows.find((r) => r.key === 'fiberG')).toMatchObject({ goal: 40, pct: 10, tone: 'amber' });
    expect(rows.find((r) => r.key === 'magnesiumMg')).toMatchObject({ goal: 420, pct: 100, tone: 'emerald' });
    expect(rows.find((r) => r.key === 'sodiumMg')).toMatchObject({ ceiling: true, tone: 'amber' });
    expect([microTone(130, false), microTone(50, true)]).toEqual(['primary', 'emerald']);
  });

  it('groups by slot in day order and omits empty slots', () => {
    const g = groupBySlot([{ slot: 'DINNER' as const }, { slot: 'BREAKFAST' as const }, { slot: 'DINNER' as const }]);
    expect(g.map((x) => [x.slot, x.entries.length])).toEqual([
      ['BREAKFAST', 1],
      ['DINNER', 2],
    ]);
  });

  it('formats dates, water, macros and slot defaults', () => {
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(dayStamp('2026-11-23')).toBe('NOV 23, 2026');
    expect(waterTotal([{ ml: 250 }, { ml: 500 }])).toBe(750);
    expect(macroKcal({ proteinG: 150, carbsG: 200, fatG: 60 })).toBe(1940);
    expect(pcf({ proteinG: '42.4', carbsG: '68', fatG: 8 })).toBe('42 / 68 / 8');
    expect([slotForHour(7), slotForHour(12), slotForHour(18), slotForHour(22)]).toEqual(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']);
  });
});
