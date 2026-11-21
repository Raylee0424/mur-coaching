import type { ExplainDto, RuleTraceStep, SettingSource } from '@coaching/shared';

export type WhyState = 'insufficient' | 'overridden' | 'default';

/** Sessions the engine needs before a load call is meaningful. */
export const MIN_SESSIONS = 2;

export function whyState(e: Pick<ExplainDto, 'sessions' | 'override'>): WhyState {
  if (e.sessions.length < MIN_SESSIONS) return 'insufficient';
  return e.override ? 'overridden' : 'default';
}

export const SOURCE_LABEL: Record<SettingSource, string> = {
  DEFAULT: 'Engine default',
  COACH: 'Your rule',
  CLIENT: 'Client override',
  PRESCRIPTION: 'Prescription',
  EXERCISE: 'Exercise rule',
};

export type RuleStatus = 'decided' | 'also' | 'not';

/** The verdict rule, rules whose condition also held (lower precedence), and rules that did not fire. */
export function ruleStatus(step: RuleTraceStep): RuleStatus {
  return step.decided ? 'decided' : step.matched ? 'also' : 'not';
}

/** Weight the engine would propose for INCREASE_LOAD with a different increment (kg, 2 decimals). */
export function simulatedLoad(topWeightKg: number, incrementKg: number): number {
  return Math.round((topWeightKg + incrementKg) * 100) / 100;
}

/** Only these sources can be overridden by the what-if cap: a prescription, exercise rule or client override wins over it. */
export function capIsSimulatable(source: SettingSource): boolean {
  return source === 'DEFAULT' || source === 'COACH';
}

export function formatSessions(n: number): string {
  return `${n} ${n === 1 ? 'session' : 'sessions'}`;
}
