import { describe, expect, it } from 'vitest';
import { addMeso, addMicro, clampToDuration, mesocyclesToInput, patchMeso, patchMicro, removeMeso, weekBlock, type DraftMeso } from './periodization-model';

const base = (): DraftMeso[] => addMeso([], 12);

describe('addMeso', () => {
  it('starts after the last block and trims to the program length', () => {
    const two = addMeso(addMeso([], 6), 6);
    expect(two.map((m) => [m.startWeek, m.endWeek])).toEqual([['1', '4'], ['5', '6']]);
  });
  it('adds nothing once the program is full', () => {
    expect(addMeso(addMeso([], 4), 4)).toHaveLength(1);
  });
});

describe('addMicro', () => {
  it('adds a one-week microcycle after the last one, inside the block', () => {
    let m = base();
    for (let i = 0; i < 6; i++) m = addMicro(m, m[0]!.key);
    expect(m[0]!.microcycles.map((c) => c.startWeek)).toEqual(['1', '2', '3', '4']);
  });
});

describe('clampToDuration', () => {
  it('drops blocks past the end and trims the one that straddles it', () => {
    let m = addMeso(addMeso(base(), 12), 12);
    m = addMicro(patchMeso(m, m[1]!.key, { startWeek: '5', endWeek: '8' }), m[1]!.key);
    const out = clampToDuration(m, 6);
    expect(out.map((x) => [x.startWeek, x.endWeek])).toEqual([['1', '4'], ['5', '6']]);
    expect(clampToDuration(m, 3).map((x) => x.endWeek)).toEqual(['3']);
  });
});

describe('mesocyclesToInput', () => {
  it('parses weeks, RPE and volume for the API', () => {
    let m = base();
    m = addMicro(m, m[0]!.key);
    m = patchMicro(m, m[0]!.key, m[0]!.microcycles[0]!.key, { isDeload: true, rpeMin: '6', rpeMax: '7.5', volumeDeltaPct: '-35' });
    const r = mesocyclesToInput(m, 12);
    expect(r.ok && r.input[0]?.microcycles[0]).toMatchObject({ startWeek: 1, endWeek: 1, isDeload: true, rpeMin: 6, rpeMax: 7.5, volumeDeltaPct: -35 });
  });
  it('flags bad fields by key and overlaps with the shared rule', () => {
    const b = base();
    const m = patchMeso(b, b[0]!.key, { name: ' ', endWeek: 'x' });
    const bad = mesocyclesToInput(m, 12);
    expect(bad.ok).toBe(false);
    expect(!bad.ok && Object.keys(bad.errors)).toEqual([`meso.${m[0]!.key}.name`, `meso.${m[0]!.key}.weeks`]);

    let two = addMeso(base(), 12);
    two = patchMeso(two, two[1]!.key, { startWeek: '3' });
    const overlap = mesocyclesToInput(two, 12);
    expect(!overlap.ok && overlap.errors['periodization']).toMatch(/overlaps/);
  });
  it('rejects RPE outside 1–10 and off half steps', () => {
    const one = base();
    const two = addMicro(one, one[0]!.key);
    const k = two[0]!.microcycles[0]!.key;
    const r = mesocyclesToInput(patchMicro(two, two[0]!.key, k, { rpeMin: '7.3' }), 12);
    expect(!r.ok && r.errors[`micro.${k}.rpe`]).toBeTruthy();
  });
});

describe('weekBlock / removeMeso', () => {
  it('names the block, microcycle and RPE for a week', () => {
    let m = base();
    m = addMicro(m, m[0]!.key);
    m = patchMicro(m, m[0]!.key, m[0]!.microcycles[0]!.key, { rpeMin: '8', rpeMax: '8', isDeload: true });
    expect(weekBlock(m, 1)).toMatchObject({ mesoIndex: 0, mesoName: 'Block 1', microLabel: 'Week 1', isDeload: true, rpe: '8' });
    expect(weekBlock(m, 2)).toMatchObject({ microLabel: null, isDeload: false });
    expect(weekBlock(m, 9)).toBeNull();
    expect(removeMeso(m, m[0]!.key)).toEqual([]);
  });
});
