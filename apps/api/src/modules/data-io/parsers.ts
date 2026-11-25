import { createHash } from 'node:crypto';
import type { ImportSource, WeightUnit } from '@coaching/shared';
import { parseCsv } from './csv';

const LB_TO_KG = 0.45359237;

export interface ParsedSet {
  reps: number;
  weightKg: number;
  rpe: number | null;
  isWarmup: boolean;
}

export interface ParsedExercise {
  sourceName: string;
  notes: string | null;
  sets: ParsedSet[];
}

export interface ParsedSession {
  hash: string;
  performedAt: Date;
  title: string;
  notes: string | null;
  exercises: ParsedExercise[];
}

export type MealSlotName = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface ParsedMeal {
  hash: string;
  date: string;
  slot: MealSlotName;
  name: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sodiumMg: number | null;
}

export interface ParseResult<T> {
  rowCount: number;
  skippedRows: number;
  units: T[];
  warnings: string[];
}

export class ImportFormatError extends Error {}

export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

/** Same bytes modulo line endings, BOM and trailing space hash the same. */
export const fileHash = (csv: string): string => sha256(csv.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim());

const norm = (h: string): string => h.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');

/** Column index by normalized header name; the first alias that exists wins. */
function columns(header: readonly string[]) {
  const names = header.map(norm);
  return (...aliases: string[]): number => {
    for (const a of aliases) {
      const i = names.indexOf(norm(a));
      if (i !== -1) return i;
    }
    return -1;
  };
}

const num = (raw: string | undefined): number | null => {
  if (raw === undefined) return null;
  const s = raw.trim().replace(/\s/g, '');
  if (!s) return null;
  // "1.234,5" (European) and "1,234.5" both read as 1234.5; a lone comma is a decimal comma.
  const cleaned = s.includes('.') && s.includes(',') ? (s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')) : s.replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const round = (n: number, dp: number): number => Math.round(n * 10 ** dp) / 10 ** dp;
const text = (raw: string | undefined, max: number): string | null => {
  const s = raw?.trim();
  return s ? s.slice(0, max) : null;
};

const rpeOf = (raw: string | undefined): number | null => {
  const n = num(raw);
  return n !== null && n >= 1 && n <= 10 ? Math.round(n * 2) / 2 : null;
};

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** "2024-01-15 18:00:00", ISO, or Hevy's "15 Jan 2024, 18:00". Times without a zone read as UTC. */
export function parseDateTime(raw: string): Date | null {
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (iso) {
    const [, y, mo, d, h = '0', mi = '0', se = '0'] = iso;
    const out = new Date(Date.UTC(+y!, +mo! - 1, +d!, +h, +mi, +se));
    return out.getUTCDate() === +d! ? out : null;
  }
  const hevy = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d{2})/.exec(s);
  if (hevy) {
    const month = MONTHS[hevy[2]!.toLowerCase()];
    if (month === undefined) return null;
    return new Date(Date.UTC(+hevy[3]!, month, +hevy[1]!, +hevy[4]!, +hevy[5]!));
  }
  return null;
}

function readTable(csv: string, required: string[]): { header: string[]; rows: string[][]; col: ReturnType<typeof columns> } {
  const [header, ...rows] = parseCsv(csv);
  if (!header) throw new ImportFormatError('The file is empty.');
  const col = columns(header);
  const missing = required.filter((r) => col(...r.split('|')) === -1);
  if (missing.length) throw new ImportFormatError(`This does not look like the right export: missing ${missing.map((m) => `"${m.split('|')[0]}"`).join(', ')}.`);
  return { header, rows, col };
}

/** Hash per unit plus its occurrence index, so two identical rows in one file stay two rows and a re-import maps 1:1. */
function withHashes<T extends { hash: string }>(units: Omit<T, 'hash'>[], keyOf: (u: Omit<T, 'hash'>) => string): T[] {
  const seen = new Map<string, number>();
  return units.map((u) => {
    const key = keyOf(u);
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return { ...u, hash: sha256(`${key}#${n}`) } as T;
  });
}

// ─── Workouts ───

export function parseWorkouts(source: Extract<ImportSource, 'STRONG' | 'HEVY'>, csv: string, defaultUnit: WeightUnit): ParseResult<ParsedSession> {
  const hevy = source === 'HEVY';
  const { header, rows, col } = readTable(csv, hevy ? ['start_time', 'exercise_title', 'reps'] : ['date', 'exercise name', 'reps']);
  const c = {
    date: hevy ? col('start_time') : col('date'),
    title: hevy ? col('title') : col('workout name'),
    exercise: hevy ? col('exercise_title') : col('exercise name'),
    order: hevy ? col('set_type') : col('set order'),
    reps: col('reps'),
    rpe: col('rpe'),
    notes: hevy ? col('exercise_notes') : col('notes'),
    sessionNotes: hevy ? col('description') : col('workout notes'),
    weight: col('weight'),
  };
  // Header units win over the chosen unit: Strong writes "Weight (kg)" in some locales.
  const kgHeader = header.findIndex((h) => /weight.*\(kg\)|weight_kg/i.test(h));
  const lbHeader = header.findIndex((h) => /weight.*\(lbs?\)|weight_lbs?/i.test(h));
  const weightCol = kgHeader !== -1 ? kgHeader : lbHeader !== -1 ? lbHeader : c.weight;
  const unit: WeightUnit = kgHeader !== -1 ? 'KG' : lbHeader !== -1 ? 'LB' : defaultUnit;

  const sessions = new Map<string, Omit<ParsedSession, 'hash'>>();
  let skipped = 0;
  for (const r of rows) {
    const performedAt = parseDateTime(r[c.date] ?? '');
    const name = text(r[c.exercise], 120);
    const reps = num(r[c.reps]);
    const order = (r[c.order] ?? '').trim().toLowerCase();
    if (!performedAt || !name || reps === null || !Number.isInteger(reps) || reps < 1 || reps > 1000 || order === 'rest timer') {
      skipped++;
      continue;
    }
    const rawWeight = num(r[weightCol]) ?? 0;
    const weightKg = round(unit === 'LB' ? rawWeight * LB_TO_KG : rawWeight, 2);
    if (weightKg < 0 || weightKg > 1500) {
      skipped++;
      continue;
    }
    const title = text(r[c.title], 80) ?? 'Imported workout';
    const key = `${performedAt.toISOString()}|${title}`;
    const session = sessions.get(key) ?? { performedAt, title, notes: text(r[c.sessionNotes], 1000), exercises: [] };
    sessions.set(key, session);
    let ex = session.exercises.at(-1);
    if (!ex || ex.sourceName !== name) {
      ex = session.exercises.find((e) => e.sourceName === name) ?? { sourceName: name, notes: text(r[c.notes], 500), sets: [] };
      if (!session.exercises.includes(ex)) session.exercises.push(ex);
    }
    ex.sets.push({ reps, weightKg, rpe: rpeOf(r[c.rpe]), isWarmup: order === 'w' || order === 'warmup' });
  }
  const units = withHashes<ParsedSession>(
    [...sessions.values()].sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime()),
    (s) => JSON.stringify([source, s.performedAt.toISOString(), s.title, s.exercises.map((e) => [e.sourceName.toLowerCase(), e.sets.map((x) => [x.weightKg, x.reps, x.rpe, x.isWarmup])])]),
  );
  const warnings = unit !== defaultUnit ? [`Weights read as ${unit === 'KG' ? 'kilograms' : 'pounds'} from the file header.`] : [];
  return { rowCount: rows.length, skippedRows: skipped, units, warnings };
}

// ─── Nutrition ───

const SLOTS: Record<string, MealSlotName> = { breakfast: 'BREAKFAST', lunch: 'LUNCH', dinner: 'DINNER', snack: 'SNACK', snacks: 'SNACK' };

export function parseNutrition(source: Extract<ImportSource, 'MYFITNESSPAL' | 'MACROFACTOR'>, csv: string): ParseResult<ParsedMeal> {
  const { rows, col } = readTable(csv, ['date', 'calories|energy|kcal']);
  const c = {
    date: col('date'),
    meal: col('meal', 'meal name'),
    food: col('food name', 'food', 'name'),
    grams: col('serving size (g)', 'grams', 'amount (g)', 'serving (g)'),
    kcal: col('calories', 'energy', 'kcal', 'calories (kcal)', 'energy (kcal)'),
    protein: col('protein', 'protein (g)'),
    carbs: col('carbohydrates', 'carbs', 'carbohydrates (g)', 'carbs (g)'),
    fat: col('fat', 'fat (g)', 'total fat'),
    fiber: col('fiber', 'fibre', 'fiber (g)', 'dietary fiber'),
    sodium: col('sodium', 'sodium (mg)'),
  };
  const label = source === 'MYFITNESSPAL' ? 'MyFitnessPal' : 'MacroFactor';
  const meals: Omit<ParsedMeal, 'hash'>[] = [];
  let skipped = 0;
  for (const r of rows) {
    const at = parseDateTime(r[c.date] ?? '');
    const kcal = num(r[c.kcal]);
    if (!at || kcal === null || kcal < 0 || kcal > 20_000) {
      skipped++;
      continue;
    }
    const mealRaw = (r[c.meal] ?? '').trim();
    const slot = SLOTS[mealRaw.toLowerCase()] ?? 'SNACK';
    const macro = (i: number, max: number): number => Math.min(max, Math.max(0, round(num(r[i]) ?? 0, 1)));
    const optional = (i: number, max: number): number | null => (i === -1 || num(r[i]) === null ? null : macro(i, max));
    const food = text(r[c.food], 100);
    meals.push({
      date: at.toISOString().slice(0, 10),
      slot,
      name: (food ?? `${label} · ${mealRaw || 'Daily total'}`).slice(0, 120),
      grams: Math.min(99_999, Math.max(0.1, round(num(r[c.grams]) ?? 100, 1))),
      kcal: Math.min(99_999, round(kcal, 1)),
      proteinG: macro(c.protein, 9999),
      carbsG: macro(c.carbs, 9999),
      fatG: macro(c.fat, 9999),
      fiberG: optional(c.fiber, 9999),
      sodiumMg: optional(c.sodium, 9_999_999),
    });
  }
  const units = withHashes<ParsedMeal>(meals, (m) => JSON.stringify([source, m.date, m.slot, m.name, m.kcal, m.proteinG, m.carbsG, m.fatG]));
  return { rowCount: rows.length, skippedRows: skipped, units, warnings: [] };
}

/** Closest library name by shared words (case-insensitive), for an unmatched exercise. */
export function suggestExercise<T extends { id: string; name: string }>(sourceName: string, library: readonly T[]): T | null {
  const words = (s: string): Set<string> => new Set(s.toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length > 1));
  const want = words(sourceName);
  let best: T | null = null;
  let bestScore = 0;
  for (const e of library) {
    const have = words(e.name);
    const shared = [...want].filter((w) => have.has(w)).length;
    const score = shared / Math.max(want.size, have.size);
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return bestScore >= 0.5 ? best : null;
}
