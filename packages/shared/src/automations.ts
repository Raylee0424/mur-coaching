import type { IsoDateString } from './common';

export const AutomationTrigger = { PAYMENT_RECEIVED: 'PAYMENT_RECEIVED', SESSION_MISSED: 'SESSION_MISSED', CHECK_IN_OVERDUE: 'CHECK_IN_OVERDUE' } as const;
export type AutomationTrigger = (typeof AutomationTrigger)[keyof typeof AutomationTrigger];

export const AUTOMATION_TRIGGERS: Record<AutomationTrigger, { label: string; event: string; defaultDelayHours: number }> = {
  PAYMENT_RECEIVED: { label: 'Payment received', event: 'a client payment succeeds', defaultDelayHours: 0 },
  SESSION_MISSED: { label: 'Scheduled session missed', event: 'a planned session day ends without a log', defaultDelayHours: 24 },
  CHECK_IN_OVERDUE: { label: 'Check-in overdue', event: 'a check-in due day ends without a response', defaultDelayHours: 48 },
};

export const AUTOMATION_LIMITS = { maxRules: 20, maxName: 80, maxBody: 1000, maxDelayHours: 336, runLog: 30 } as const;

export interface AutomationRuleDto {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  delayHours: number;
  messageBody: string;
  enabled: boolean;
  createdAt: IsoDateString;
  runsThisMonth: number;
  lastRunAt: IsoDateString | null;
}

export interface AutomationRunDto {
  id: string;
  ruleName: string;
  clientName: string;
  firedAt: IsoDateString;
}

export interface AutomationsDto {
  rules: AutomationRuleDto[];
  runs: AutomationRunDto[];
}

export interface SaveAutomationRuleRequest {
  name: string;
  trigger: AutomationTrigger;
  delayHours: number;
  messageBody: string;
  enabled: boolean;
}

export interface AutomationCandidateDto {
  clientId: string;
  clientName: string;
  /** What fired, e.g. "Session on 2026-11-20". */
  subject: string;
  dueAt: IsoDateString;
}

export interface RunAutomationsResultDto {
  sent: number;
}

/** Placeholders: `{firstName}`, `{coachName}`. */
export function renderAutomationMessage(body: string, vars: { firstName: string; coachName: string }): string {
  return body.replace(/\{firstName\}/g, vars.firstName).replace(/\{coachName\}/g, vars.coachName).trim();
}

const DAY_MS = 86_400_000;

/**
 * Most recent due date (YYYY-MM-DD) on or before `today` for a check-in schedule, never before its start.
 * Weekly: the last `weekday`. Once: `dueDate` when it has passed.
 */
export function lastDuePeriod(
  schedule: { cadence: 'WEEKLY' | 'ONCE'; weekday: number | null; dueDate: string | null; startDate: string },
  today: string,
): string | null {
  if (schedule.cadence === 'ONCE') return schedule.dueDate && schedule.dueDate <= today ? schedule.dueDate : null;
  if (schedule.weekday === null) return null;
  const t = Date.parse(`${today}T00:00:00Z`);
  const back = (new Date(t).getUTCDay() - schedule.weekday + 7) % 7;
  const period = new Date(t - back * DAY_MS).toISOString().slice(0, 10);
  return period >= schedule.startDate ? period : null;
}

/** End of a UTC calendar day plus a delay: when a missed-day trigger becomes due. */
export const dueAfterDay = (date: string, delayHours: number): number => Date.parse(`${date}T00:00:00Z`) + DAY_MS + delayHours * 3_600_000;
