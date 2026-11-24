import { WORKOUT_LOG_LIMITS } from '@coaching/shared';
import type { VoiceIntent } from '@coaching/shared';
import { LOGGER_RPE, type StepValues } from './logger-model';

const r2 = (n: number): number => Math.round(n * 100) / 100;

function clock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Parsed-intent chips, in the HUD's order. */
export function intentChips(intent: VoiceIntent, unit: string): string[] {
  switch (intent.type) {
    case 'LOG_SET':
      return [
        `Weight: ${intent.weight === null ? 'keep' : `${intent.weight} ${unit}`}`,
        `Reps: ${intent.reps ?? 'keep'}`,
        `RPE: ${intent.rpe === null ? 'keep' : intent.rpe.toFixed(1)}`,
        ...(intent.note ? [`Note: "${intent.note}"`] : []),
        ...(intent.restSeconds ? [`Rest Timer: ${clock(intent.restSeconds)}`] : []),
      ];
    case 'NOTE':
      return [`Note: "${intent.text}"`];
    case 'REST_TIMER':
      return [`Rest Timer: ${clock(intent.seconds)}`];
    case 'SWAP':
      return [`Exercise Swap: ${intent.exerciseQuery}`];
    default:
      return ['Not understood'];
  }
}

/**
 * The set a LOG_SET intent would log: spoken values replace the stepper values, unspoken ones keep them. RPE snaps
 * to the logger's 0.5 steps. Returns an error instead when a value is outside what the logger accepts.
 */
export function voiceSetValues(current: StepValues, intent: Extract<VoiceIntent, { type: 'LOG_SET' }>, maxWeight: number): { ok: true; values: StepValues } | { ok: false; error: string } {
  const weight = intent.weight ?? current.weight;
  const reps = intent.reps ?? current.reps;
  const rpe = intent.rpe === null ? current.rpe : Math.round(intent.rpe / LOGGER_RPE.step) * LOGGER_RPE.step;
  if (weight < 0 || weight > maxWeight) return { ok: false, error: `Weight must be between 0 and ${maxWeight}.` };
  if (reps < 1 || reps > WORKOUT_LOG_LIMITS.maxReps) return { ok: false, error: `Reps must be between 1 and ${WORKOUT_LOG_LIMITS.maxReps}.` };
  if (rpe < LOGGER_RPE.min || rpe > LOGGER_RPE.max) return { ok: false, error: `RPE must be between ${LOGGER_RPE.min.toFixed(1)} and ${LOGGER_RPE.max.toFixed(1)}.` };
  return { ok: true, values: { weight: r2(weight), reps, rpe } };
}

export function appendNote(existing: string | null | undefined, text: string): string {
  const base = (existing ?? '').trim();
  return (base ? `${base} · ${text}` : text).slice(0, WORKOUT_LOG_LIMITS.maxNoteLength);
}

/**
 * Whether Confirm can commit the intent. Swaps never auto-commit: the Swap list shows limitation flags, so the
 * athlete picks there.
 */
export function canCommit(intent: VoiceIntent, hasExercise: boolean): boolean {
  if (intent.type === 'UNKNOWN' || intent.type === 'SWAP') return false;
  return intent.type === 'REST_TIMER' || hasExercise;
}
