import { RecommendationAction } from '@coaching/shared';
import type { ExplainDto, TargetSource, TodayBanner, WeightUnit } from '@coaching/shared';
import { formatStepValue, formatTargetLine } from '@/components/logger/logger-model';
import { toNumber } from '@/lib/format';
import { kgToDisplay, unitLabel } from '@/lib/units';

export function greetingFor(hour: number): string {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** "Nov 12" in UTC, matching formatDate so a session never shifts a day. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const num = (v: string | number | null): number | null => (v === null ? null : toNumber(v));

/** Today's per-exercise target line, e.g. "157.5 kg × 5 @ RPE 8.5". Empty when nothing is set. */
export function todayTargetLine(
  t: { weightKg: string | null; repsMin: number | null; repsMax: number | null; rpe: string | null },
  unit: WeightUnit,
): string {
  return formatTargetLine({ weightKg: num(t.weightKg), repsMin: t.repsMin, repsMax: t.repsMax, rpe: num(t.rpe) }, unit);
}

export function targetSourceNote(source: TargetSource): string | null {
  switch (source) {
    case 'LAST_SESSION':
      return 'Based on your last session';
    case 'BASELINE':
      return 'From your starting weight';
    case 'NONE':
      return 'No target yet. Pick your own weight.';
    default:
      return null;
  }
}

const BANNER_VERB: Record<RecommendationAction, string> = {
  INCREASE_LOAD: 'INCREASE LOAD APPROVED',
  INCREASE_REPS: 'ADD REPS APPROVED',
  HOLD: 'HOLD APPROVED',
  DELOAD: 'DELOAD APPROVED',
};

export function bannerLabel(action: RecommendationAction): string {
  return BANNER_VERB[action];
}

/** "Coach Ray accepted +2.5 kg on your Back Squat. Today's target is locked at 157.5 kg." */
export function bannerText(b: TodayBanner, unit: WeightUnit): string {
  const who = b.autoApproved || !b.approvedByName ? 'The engine auto-approved' : `${b.approvedByName} accepted`;
  const to = b.toWeightKg === null ? null : `${formatStepValue('weight', kgToDisplay(toNumber(b.toWeightKg), unit))} ${unitLabel(unit)}`;
  const locked = to ? ` Today's target is locked at ${to}.` : '';
  if (b.action === RecommendationAction.INCREASE_LOAD && b.fromWeightKg !== null && b.toWeightKg !== null) {
    const delta = kgToDisplay(toNumber(b.toWeightKg), unit) - kgToDisplay(b.fromWeightKg, unit);
    if (delta > 0) return `${who} +${formatStepValue('weight', delta)} ${unitLabel(unit)} on your ${b.exerciseName}.${locked}`;
  }
  switch (b.action) {
    case RecommendationAction.INCREASE_LOAD:
      return `${who} a load increase on your ${b.exerciseName}.${locked}`;
    case RecommendationAction.INCREASE_REPS:
      return `${who} more reps on your ${b.exerciseName}.${locked}`;
    case RecommendationAction.HOLD:
      return `${who} keeping your ${b.exerciseName} where it is.${locked}`;
    case RecommendationAction.DELOAD:
      return `${who} a lighter load on your ${b.exerciseName} to recover.${locked}`;
  }
}

// ── "Why this call" (client wording) ─────────────────────────────────────────

const TITLE_VERB: Record<RecommendationAction, string> = {
  INCREASE_LOAD: 'went up',
  INCREASE_REPS: 'asks for more reps',
  HOLD: 'stayed the same',
  DELOAD: 'came down',
};

export function whyTitle(action: RecommendationAction, exerciseName: string): string {
  return `Why your ${exerciseName} target ${TITLE_VERB[action]}.`;
}

export type BulletIcon = 'check' | 'effort' | 'trend';
export interface Bullet {
  icon: BulletIcon;
  text: string;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Up to three plain-language reasons, derived from the sessions the engine looked at. */
export function whyBullets(e: Pick<ExplainDto, 'action' | 'reason' | 'sessions' | 'prescription' | 'settings'>): Bullet[] {
  const recent = e.sessions.slice(-3);
  const out: Bullet[] = [];

  const goal = e.prescription?.repsMax ?? e.prescription?.repsMin ?? null;
  if (recent.length > 0 && goal !== null) {
    const hits = recent.map((s) => s.topSetReps);
    const n = recent.length;
    const sessions = n === 1 ? 'your last session' : `your last ${n} sessions`;
    if (hits.every((r) => r >= goal)) out.push({ icon: 'check', text: `You hit all ${goal} reps in ${sessions}` });
    else out.push({ icon: 'check', text: `You did ${Math.min(...hits)}–${Math.max(...hits)} reps in ${sessions}, against a goal of ${goal}` });
  } else {
    out.push({ icon: 'check', text: e.reason });
  }

  const rpes = recent.flatMap((s) => (s.avgRpe === null ? [] : [s.avgRpe]));
  if (rpes.length > 0) {
    const avg = round1(rpes.reduce((a, b) => a + b, 0) / rpes.length);
    out.push({ icon: 'effort', text: `Your effort averaged ${avg} out of 10` });
  }

  const cap = e.prescription?.rpeCap ?? e.settings?.rpeCap.value ?? null;
  if (cap !== null) {
    const limit = formatStepValue('rpe', cap);
    const text: Record<RecommendationAction, string> = {
      INCREASE_LOAD: `Your coach's limit is ${limit}, so there's room to add weight`,
      INCREASE_REPS: `Your coach's limit is ${limit}, so you can push for more reps first`,
      HOLD: `Your coach's limit is ${limit} and you're close to it, so the weight stays`,
      DELOAD: `Your effort ran above your coach's limit of ${limit}, so it's time to back off`,
    };
    out.push({ icon: 'trend', text: text[e.action] });
  }
  return out;
}

export interface MiniPoint {
  weightKg: number;
  label: string;
}

/** Last three sessions (oldest to newest) for the mini chart. */
export function miniSeries(sessions: ExplainDto['sessions'], unit: WeightUnit): { weights: string; points: MiniPoint[]; labels: string[] } {
  const last = sessions.slice(-3);
  const display = last.map((s) => kgToDisplay(s.topWeightKg, unit));
  return {
    weights: `${display.map((w) => formatStepValue('weight', w)).join(' → ')} ${unitLabel(unit)}`,
    points: last.map((s) => ({ weightKg: s.topWeightKg, label: shortDate(s.performedAt) })),
    labels: last.map((s) => `${shortDate(s.performedAt)}${s.avgRpe === null ? '' : ` · RPE ${s.avgRpe.toFixed(1)}`}`),
  };
}

/** SVG polyline points for a tiny trend line in a 300 x 72 box. */
export function sparkPoints(values: number[], width = 300, height = 72, padX = 24, padY = 14): Array<{ x: number; y: number }> {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : padX + (i * (width - 2 * padX)) / (values.length - 1),
    y: span === 0 ? height / 2 : padY + ((max - v) / span) * (height - 2 * padY),
  }));
}

/** "Set by" footer line. */
export function setByLine(e: Pick<ExplainDto, 'status' | 'autoApproved' | 'override'>, coachName: string | null): string {
  if (e.override) return `Set by: ${e.override.byName ?? 'your coach'}, who adjusted the engine's call`;
  if (e.status === 'PENDING') return "Set by: Engine, waiting for your coach's approval";
  if (e.autoApproved) return 'Set by: Engine, auto-approved';
  return coachName ? `Set by: Engine, approved by ${coachName}` : 'Set by: Engine, approved by your coach';
}
