import { PERIODIZATION_LIMITS as PL, validatePeriodization } from '@coaching/shared';
import type { MesocycleDto, MesocycleInput, MicrocycleInput } from '@coaching/shared';

/** Block planning for the builder. Numeric inputs stay strings while editing so half-typed numbers survive. */

export interface DraftMicro {
  key: string;
  id?: string;
  label: string;
  startWeek: string;
  endWeek: string;
  isDeload: boolean;
  rpeMin: string;
  rpeMax: string;
  volumeDeltaPct: string;
}

export interface DraftMeso {
  key: string;
  id?: string;
  name: string;
  focus: string;
  startWeek: string;
  endWeek: string;
  microcycles: DraftMicro[];
}

let seq = 0;
const key = (): string => `p${++seq}`;

/** Whole number from a field, or NaN. */
const whole = (s: string): number => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);

export function fromMesocycles(dtos: readonly MesocycleDto[]): DraftMeso[] {
  return dtos.map((m) => ({
    key: key(),
    id: m.id,
    name: m.name,
    focus: m.focus ?? '',
    startWeek: String(m.startWeek),
    endWeek: String(m.endWeek),
    microcycles: m.microcycles.map((c) => ({
      key: key(),
      id: c.id,
      label: c.label,
      startWeek: String(c.startWeek),
      endWeek: String(c.endWeek),
      isDeload: c.isDeload,
      rpeMin: c.rpeMin ?? '',
      rpeMax: c.rpeMax ?? '',
      volumeDeltaPct: c.volumeDeltaPct === null ? '' : String(c.volumeDeltaPct),
    })),
  }));
}

/** First week after every existing block, or null when the program has no room left. */
const nextFreeWeek = (mesos: readonly DraftMeso[], duration: number): number | null => {
  const last = Math.max(0, ...mesos.map((m) => whole(m.endWeek)).filter(Number.isFinite));
  return last + 1 <= duration ? last + 1 : null;
};

/** A new four-week block after the last one, trimmed to the program length. */
export function addMeso(mesos: readonly DraftMeso[], duration: number): DraftMeso[] {
  const start = nextFreeWeek(mesos, duration);
  if (start === null || mesos.length >= PL.maxMesocycles) return [...mesos];
  const end = Math.min(start + 3, duration);
  return [...mesos, { key: key(), name: `Block ${mesos.length + 1}`, focus: '', startWeek: String(start), endWeek: String(end), microcycles: [] }];
}

export const patchMeso = (mesos: readonly DraftMeso[], k: string, patch: Partial<Omit<DraftMeso, 'key' | 'id' | 'microcycles'>>): DraftMeso[] =>
  mesos.map((m) => (m.key === k ? { ...m, ...patch } : m));

export const removeMeso = (mesos: readonly DraftMeso[], k: string): DraftMeso[] => mesos.filter((m) => m.key !== k);

/** A one-week microcycle after the block's last one (or at its first week). */
export function addMicro(mesos: readonly DraftMeso[], mesoKey: string): DraftMeso[] {
  return mesos.map((m) => {
    if (m.key !== mesoKey || m.microcycles.length >= PL.maxMicrocyclesPerMesocycle) return m;
    const mesoStart = whole(m.startWeek);
    const mesoEnd = whole(m.endWeek);
    const lastEnd = Math.max(mesoStart - 1, ...m.microcycles.map((c) => whole(c.endWeek)).filter(Number.isFinite));
    const start = lastEnd + 1;
    if (!Number.isFinite(mesoEnd) || start > mesoEnd) return m;
    return {
      ...m,
      microcycles: [...m.microcycles, { key: key(), label: `Week ${start}`, startWeek: String(start), endWeek: String(start), isDeload: false, rpeMin: '', rpeMax: '', volumeDeltaPct: '' }],
    };
  });
}

export const patchMicro = (mesos: readonly DraftMeso[], mesoKey: string, microKey: string, patch: Partial<Omit<DraftMicro, 'key' | 'id'>>): DraftMeso[] =>
  mesos.map((m) => (m.key === mesoKey ? { ...m, microcycles: m.microcycles.map((c) => (c.key === microKey ? { ...c, ...patch } : c)) } : m));

export const removeMicro = (mesos: readonly DraftMeso[], mesoKey: string, microKey: string): DraftMeso[] =>
  mesos.map((m) => (m.key === mesoKey ? { ...m, microcycles: m.microcycles.filter((c) => c.key !== microKey) } : m));

/** Shortening the program drops blocks that start after the new end and trims the rest. */
export function clampToDuration(mesos: readonly DraftMeso[], duration: number): DraftMeso[] {
  const clamp = (s: string): string => (whole(s) > duration ? String(duration) : s);
  return mesos
    .filter((m) => !(whole(m.startWeek) > duration))
    .map((m) => ({
      ...m,
      endWeek: clamp(m.endWeek),
      microcycles: m.microcycles.filter((c) => !(whole(c.startWeek) > duration)).map((c) => ({ ...c, endWeek: clamp(c.endWeek) })),
    }));
}

export type PeriodizationErrors = Record<string, string>;

export function mesocyclesToInput(
  mesos: readonly DraftMeso[],
  duration: number,
): { ok: true; input: MesocycleInput[] } | { ok: false; errors: PeriodizationErrors } {
  const errors: PeriodizationErrors = {};
  const decimal = (s: string, at: string): number | null => {
    if (s.trim() === '') return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 1 || n > 10 || Math.round(n * 2) !== n * 2) errors[at] = '1–10, .5 steps';
    return Number.isFinite(n) ? n : null;
  };
  const input = mesos.map((m): MesocycleInput => {
    if (!m.name.trim()) errors[`meso.${m.key}.name`] = 'Name the block.';
    const startWeek = whole(m.startWeek);
    const endWeek = whole(m.endWeek);
    if (!Number.isFinite(startWeek) || !Number.isFinite(endWeek)) errors[`meso.${m.key}.weeks`] = 'Enter whole weeks.';
    return {
      ...(m.id ? { id: m.id } : {}),
      name: m.name.trim(),
      focus: m.focus.trim() || null,
      startWeek,
      endWeek,
      microcycles: m.microcycles.map((c): MicrocycleInput => {
        if (!c.label.trim()) errors[`micro.${c.key}.label`] = 'Name it.';
        const cs = whole(c.startWeek);
        const ce = whole(c.endWeek);
        if (!Number.isFinite(cs) || !Number.isFinite(ce)) errors[`micro.${c.key}.weeks`] = 'Enter whole weeks.';
        const rpeMin = decimal(c.rpeMin, `micro.${c.key}.rpe`);
        const rpeMax = decimal(c.rpeMax, `micro.${c.key}.rpe`);
        const vol = c.volumeDeltaPct.trim() === '' ? null : Number(c.volumeDeltaPct);
        if (vol !== null && (!Number.isInteger(vol) || vol < -100 || vol > 100)) errors[`micro.${c.key}.volume`] = '-100 to 100';
        return { ...(c.id ? { id: c.id } : {}), label: c.label.trim(), startWeek: cs, endWeek: ce, isDeload: c.isDeload, rpeMin, rpeMax, volumeDeltaPct: vol };
      }),
    };
  });
  if (Object.keys(errors).length === 0) {
    const problem = validatePeriodization(input, duration);
    if (problem) errors['periodization'] = problem;
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input };
}

export interface WeekBlock {
  /** Index into the block list, for colouring. */
  mesoIndex: number;
  mesoName: string;
  microLabel: string | null;
  isDeload: boolean;
  rpe: string | null;
}

/** The block (and microcycle) a week falls in, from the draft as typed. Null for unplanned weeks. */
export function weekBlock(mesos: readonly DraftMeso[], week: number): WeekBlock | null {
  const index = mesos.findIndex((m) => week >= whole(m.startWeek) && week <= whole(m.endWeek));
  const meso = mesos[index];
  if (!meso) return null;
  const micro = meso.microcycles.find((c) => week >= whole(c.startWeek) && week <= whole(c.endWeek));
  const rpe = micro && micro.rpeMin && micro.rpeMax ? (micro.rpeMin === micro.rpeMax ? micro.rpeMin : `${micro.rpeMin}–${micro.rpeMax}`) : (micro?.rpeMin || micro?.rpeMax || null);
  return { mesoIndex: index, mesoName: meso.name, microLabel: micro?.label ?? null, isDeload: micro?.isDeload ?? false, rpe: rpe || null };
}

/** Stable fingerprint part for dirty checks (ignores local keys). */
export const mesoFingerprint = (mesos: readonly DraftMeso[]): unknown =>
  mesos.map((m) => [m.id, m.name, m.focus, m.startWeek, m.endWeek, m.microcycles.map((c) => [c.id, c.label, c.startWeek, c.endWeek, c.isDeload, c.rpeMin, c.rpeMax, c.volumeDeltaPct])]);

/** Colour per block, cycled. Deloads are marked by an underline, never by colour alone. */
export const BLOCK_TONES = ['bg-sky-bg text-sky', 'bg-emerald-bg text-emerald', 'bg-amber-bg text-amber', 'bg-signal-bg text-signal', 'bg-raised text-ink'] as const;
export const blockTone = (index: number): string => BLOCK_TONES[index % BLOCK_TONES.length] ?? BLOCK_TONES[0];
