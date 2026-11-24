import { AI_LIMITS, GOAL_PRESCRIPTION, LimitationSeverity, MUSCLE_GROUP_LABELS, MuscleGroup, WORKOUT_GOAL_LABELS } from '@coaching/shared';
import type { Equipment, GeneratedExerciseDto, GenerateWorkoutRequest, LimitationFlag } from '@coaching/shared';
import { limitationFlag, type ConflictExercise, type LimitationRow } from '../limitations/conflict';
import type { ContextCall } from './ai-context.service';

export interface CandidateExercise extends ConflictExercise {
  name: string;
  equipment: Equipment | null;
}

export interface Candidate extends CandidateExercise {
  limitation: LimitationFlag | null;
}

/** Full-body order when no target muscles are chosen: big movers first. */
export const FULL_BODY_ORDER: readonly MuscleGroup[] = [
  MuscleGroup.QUADS,
  MuscleGroup.CHEST,
  MuscleGroup.BACK,
  MuscleGroup.HAMSTRINGS,
  MuscleGroup.SHOULDERS,
  MuscleGroup.GLUTES,
  MuscleGroup.BICEPS,
  MuscleGroup.TRICEPS,
  MuscleGroup.CALVES,
  MuscleGroup.CORE,
];

const SECONDS_PER_SET = 45;
const SETUP_SECONDS = 120;

/** Minutes one exercise takes at the goal's sets and rest. */
export function minutesPerExercise(req: Pick<GenerateWorkoutRequest, 'goal'>): number {
  const p = GOAL_PRESCRIPTION[req.goal];
  return (p.sets * (SECONDS_PER_SET + p.restSeconds) + SETUP_SECONDS) / 60;
}

export function exerciseCount(req: Pick<GenerateWorkoutRequest, 'goal' | 'durationMin'>): number {
  return Math.max(2, Math.min(AI_LIMITS.maxExercises, Math.floor(req.durationMin / minutesPerExercise(req))));
}

/** Matches Gym Mode: an exercise with no equipment tag fits every profile. */
export const fitsEquipment = (e: Pick<CandidateExercise, 'equipment'>, allowed: readonly Equipment[]): boolean =>
  e.equipment === null || allowed.includes(e.equipment);

/**
 * Exercises the generator may use: the athlete's catalog, minus equipment they lack, minus anything an active AVOID
 * limitation covers. CAUTION exercises stay, flagged.
 */
export function eligibleCandidates(
  catalog: readonly CandidateExercise[],
  limitations: readonly LimitationRow[],
  day: string,
  equipment: readonly Equipment[],
): { candidates: Candidate[]; excludedCount: number } {
  let excludedCount = 0;
  const candidates: Candidate[] = [];
  for (const e of catalog) {
    if (!fitsEquipment(e, equipment)) continue;
    const limitation = limitationFlag(limitations, e, day);
    if (limitation?.severity === LimitationSeverity.AVOID) {
      excludedCount++;
      continue;
    }
    candidates.push({ ...e, limitation });
  }
  return { candidates, excludedCount };
}

/**
 * Deterministic pick: round-robin over the target muscles (or FULL_BODY_ORDER), preferring unflagged exercises,
 * then lifts the engine already tracks, then name. Same input, same workout.
 */
export function pickExercises(candidates: readonly Candidate[], req: GenerateWorkoutRequest, withEngineCall: ReadonlySet<string>): Candidate[] {
  const muscles = req.targetMuscles.length ? [...new Set(req.targetMuscles)] : FULL_BODY_ORDER;
  const rank = (c: Candidate): number => (c.limitation ? 2 : 0) + (withEngineCall.has(c.id) ? 0 : 1);
  const pools = muscles.map((m) =>
    candidates.filter((c) => c.muscleGroup === m).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)),
  );
  const want = exerciseCount(req);
  const picked: Candidate[] = [];
  const used = new Set<string>();
  for (let round = 0; picked.length < want && pools.some((p) => p.length > round); round++) {
    for (const pool of pools) {
      const next = pool.find((c) => !used.has(c.id));
      if (!next || picked.length >= want) continue;
      used.add(next.id);
      picked.push(next);
    }
  }
  return picked;
}

/**
 * Prescription per exercise. Load comes only from the engine's open call (or the coach's override of it): the
 * generator never invents or raises a load, so DELOAD and HOLD targets pass through unchanged. With an engine call,
 * its rep range wins too, so load and reps stay a matched pair.
 */
export function prescribe(picked: readonly Candidate[], req: GenerateWorkoutRequest, calls: ReadonlyMap<string, ContextCall>): GeneratedExerciseDto[] {
  const p = GOAL_PRESCRIPTION[req.goal];
  return picked.map((c) => {
    const call = calls.get(c.id) ?? null;
    const engineReps = call?.repsMin != null;
    return {
      exerciseId: c.id,
      name: c.name,
      muscleGroup: c.muscleGroup,
      equipment: c.equipment,
      sets: p.sets,
      repsMin: engineReps ? call!.repsMin! : p.repsMin,
      repsMax: engineReps ? (call!.repsMax ?? call!.repsMin!) : p.repsMax,
      restSeconds: p.restSeconds,
      rir: p.rir,
      engineWeightKg: call?.targetWeightKg != null ? call.targetWeightKg.toFixed(2) : null,
      engineAction: call?.action ?? null,
      limitation: c.limitation,
    };
  });
}

export function rulesTitle(req: GenerateWorkoutRequest): string {
  const focus = req.targetMuscles.length ? req.targetMuscles.slice(0, 3).map((m) => MUSCLE_GROUP_LABELS[m]).join(' + ') : 'Full Body';
  return `${focus} ${WORKOUT_GOAL_LABELS[req.goal]}`.slice(0, AI_LIMITS.maxTitle);
}

export function rulesRationale(req: GenerateWorkoutRequest, excludedCount: number, cautionCount: number): string {
  const p = GOAL_PRESCRIPTION[req.goal];
  const parts = [`${p.sets} sets of ${p.repsMin}–${p.repsMax} at ${p.rir} reps in reserve, ${p.restSeconds}s rest, sized for ${req.durationMin} minutes.`];
  if (excludedCount) parts.push(`${excludedCount} exercise${excludedCount === 1 ? '' : 's'} left out by your Avoid limitations.`);
  if (cautionCount) parts.push(`${cautionCount} flagged Caution: go lighter or swap.`);
  parts.push('Loads come from your progression engine targets only.');
  return parts.join(' ');
}

/**
 * Accept a model's exercise choice only if every id is an eligible candidate, with no repeats and a sane count.
 * Anything else returns null and the rules pick stands.
 */
export function validateModelPick(raw: unknown, candidates: readonly Candidate[], want: number): { ids: string[]; title: string | null; rationale: string | null } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { exerciseIds, title, rationale } = raw as { exerciseIds?: unknown; title?: unknown; rationale?: unknown };
  if (!Array.isArray(exerciseIds) || exerciseIds.length < 2 || exerciseIds.length > Math.max(want, 2)) return null;
  const allowed = new Set(candidates.map((c) => c.id));
  const ids = exerciseIds.filter((x): x is string => typeof x === 'string');
  if (ids.length !== exerciseIds.length || new Set(ids).size !== ids.length || ids.some((id) => !allowed.has(id))) return null;
  const clean = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  return { ids, title: clean(title, AI_LIMITS.maxTitle), rationale: clean(rationale, 400) };
}

export const GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    rationale: { type: 'string' },
    exerciseIds: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'rationale', 'exerciseIds'],
  additionalProperties: false,
} as const;
