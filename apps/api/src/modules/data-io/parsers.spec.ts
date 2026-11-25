import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv';
import { fileHash, parseDateTime, parseNutrition, parseWorkouts, suggestExercise } from './parsers';

const STRONG = [
  'Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE',
  '2024-01-15 18:00:00;"Push; Heavy";1h;Bench Press (Barbell);W;40;10;0;0;;;',
  '2024-01-15 18:00:00;"Push; Heavy";1h;Bench Press (Barbell);1;100;5;0;0;"felt ""fast""";;8',
  '2024-01-15 18:00:00;"Push; Heavy";1h;Running;1;0;0;3;900;;;',
  '2024-01-17 18:00:00;Pull;1h;Deadlift (Barbell);1;140;3;0;0;;;11',
].join('\r\n');

const HEVY = [
  'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_lbs,reps,distance_miles,duration_seconds,rpe',
  'Legs,"15 Jan 2024, 18:00","15 Jan 2024, 19:00",,Squat (Barbell),,,0,normal,225,5,,,8.5',
  'Legs,"15 Jan 2024, 18:00","15 Jan 2024, 19:00",,Squat (Barbell),,,1,warmup,135,5,,,',
].join('\n');

describe('csv', () => {
  it('reads quotes, doubled quotes and the semicolon delimiter', () => {
    const rows = parseCsv(STRONG);
    expect(rows[1]![1]).toBe('Push; Heavy');
    expect(rows[2]![9]).toBe('felt "fast"');
    expect(rows).toHaveLength(5);
  });

  it('writes escaped cells and defuses formulas', () => {
    expect(toCsv(['a', 'b'], [['=SUM(A1)', 'x,"y"'], [1.5, null]])).toBe('a,b\r\n\'=SUM(A1),"x,""y"""\r\n1.5,\r\n');
  });
});

describe('workout parsers', () => {
  it('groups Strong rows into sessions, marks warm-ups and drops cardio and bad RPE', () => {
    const r = parseWorkouts('STRONG', STRONG, 'KG');
    expect(r).toMatchObject({ rowCount: 4, skippedRows: 1 });
    expect(r.units.map((s) => s.title)).toEqual(['Pull', 'Push; Heavy']);
    const push = r.units[1]!;
    expect(push.exercises[0]).toMatchObject({ sourceName: 'Bench Press (Barbell)', notes: null });
    expect(push.exercises[0]!.sets).toEqual([
      { reps: 10, weightKg: 40, rpe: null, isWarmup: true },
      { reps: 5, weightKg: 100, rpe: 8, isWarmup: false },
    ]);
    expect(r.units[0]!.exercises[0]!.sets[0]!.rpe).toBeNull();
  });

  it('converts pounds from the Hevy header and parses its dates', () => {
    const r = parseWorkouts('HEVY', HEVY, 'KG');
    expect(r.units[0]!.performedAt.toISOString()).toBe('2024-01-15T18:00:00.000Z');
    expect(r.units[0]!.exercises[0]!.sets.map((s) => [s.weightKg, s.isWarmup, s.rpe])).toEqual([
      [102.06, false, 8.5],
      [61.23, true, null],
    ]);
    expect(r.warnings[0]).toMatch(/pounds/);
  });

  it('hashes stably across line endings and re-imports', () => {
    expect(fileHash(STRONG)).toBe(fileHash(STRONG.replace(/\r\n/g, '\n') + '\n'));
    expect(parseWorkouts('STRONG', STRONG, 'KG').units.map((u) => u.hash)).toEqual(parseWorkouts('STRONG', STRONG, 'KG').units.map((u) => u.hash));
  });

  it('refuses the wrong export', () => {
    expect(() => parseWorkouts('HEVY', STRONG, 'KG')).toThrow(/start_time/);
  });

  it('parses dates strictly', () => {
    expect(parseDateTime('2024-02-30')).toBeNull();
    expect(parseDateTime('3 Feb 2024, 7:05')?.toISOString()).toBe('2024-02-03T07:05:00.000Z');
  });
});

describe('nutrition parsers', () => {
  it('reads MyFitnessPal meals into slots, keeping identical rows distinct', () => {
    const csv = ['Date,Meal,Calories,Fat (g),Carbohydrates (g),Protein (g),Fiber,Sodium (mg)', '2024-01-15,Breakfast,520,18,60,30,8,400', '2024-01-15,Snacks,200,5,30,10,,', '2024-01-15,Snacks,200,5,30,10,,'].join('\n');
    const r = parseNutrition('MYFITNESSPAL', csv);
    expect(r.units[0]).toMatchObject({ date: '2024-01-15', slot: 'BREAKFAST', name: 'MyFitnessPal · Breakfast', kcal: 520, proteinG: 30, carbsG: 60, fatG: 18, fiberG: 8, sodiumMg: 400 });
    expect(r.units[1]!.fiberG).toBeNull();
    expect(new Set(r.units.map((u) => u.hash)).size).toBe(3);
  });

  it('reads MacroFactor daily totals', () => {
    const r = parseNutrition('MACROFACTOR', 'Date,Calories (kcal),Protein (g),Fat (g),Carbs (g),Fiber (g)\n2024-01-15,2450,180,70,260,30\n');
    expect(r.units[0]).toMatchObject({ slot: 'SNACK', name: 'MacroFactor · Daily total', kcal: 2450, carbsG: 260 });
  });
});

describe('suggestExercise', () => {
  it('suggests by shared words, or nothing', () => {
    const lib = [{ id: 'a', name: 'Barbell Bench Press' }, { id: 'b', name: 'Back Squat' }];
    expect(suggestExercise('Bench Press (Barbell)', lib)?.id).toBe('a');
    expect(suggestExercise('Zercher Carry', lib)).toBeNull();
  });
});
