import type { IsoDateString } from './common';

export const CheckInQuestionKind = { NUMBER: 'NUMBER', SCALE: 'SCALE', TEXT: 'TEXT' } as const;
export type CheckInQuestionKind = (typeof CheckInQuestionKind)[keyof typeof CheckInQuestionKind];

export const CHECK_IN_KIND_LABELS: Record<CheckInQuestionKind, string> = { NUMBER: 'Number', SCALE: 'Scale 1–5', TEXT: 'Text' };

export const CheckInCadence = { WEEKLY: 'WEEKLY', ONCE: 'ONCE' } as const;
export type CheckInCadence = (typeof CheckInCadence)[keyof typeof CheckInCadence];

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const CHECK_IN_LIMITS = {
  maxQuestions: 15,
  maxTitle: 80,
  maxPrompt: 200,
  maxUnit: 12,
  maxText: 2000,
  maxReply: 2000,
  /** A weekly check-in opens this many days before its due day and stays open as many days after. */
  windowDays: 3,
} as const;

export interface CheckInQuestionInput {
  prompt: string;
  kind: CheckInQuestionKind;
  required: boolean;
  unit?: string | null;
}

export interface SaveCheckInTemplateRequest {
  title: string;
  questions: CheckInQuestionInput[];
}

export interface CheckInQuestionDto extends CheckInQuestionInput {
  id: string;
  unit: string | null;
}

export interface CheckInScheduleDto {
  id: string;
  clientId: string;
  clientName: string;
  cadence: CheckInCadence;
  weekday: number | null;
  dueDate: string | null;
}

export interface CheckInTemplateDto {
  id: string;
  title: string;
  questions: CheckInQuestionDto[];
  schedules: CheckInScheduleDto[];
}

export interface CreateCheckInScheduleRequest {
  templateId: string;
  clientId: string;
  cadence: CheckInCadence;
  /** WEEKLY: 0 = Sunday … 6 = Saturday. */
  weekday?: number;
  /** ONCE: `YYYY-MM-DD`. */
  dueDate?: string;
}

/** Stored per answer: the prompt and kind are copied so later template edits leave history intact. */
export interface CheckInAnswer {
  questionId: string;
  prompt: string;
  kind: CheckInQuestionKind;
  unit: string | null;
  /** NUMBER and SCALE as a decimal string, TEXT as text, null when skipped. */
  value: string | null;
}

export interface SubmitCheckInRequest {
  /** The period being answered (`YYYY-MM-DD`), as listed by `GET /me/check-ins`. */
  periodDate: string;
  answers: { questionId: string; value: string | null }[];
}

export interface CheckInResponseDto {
  id: string;
  templateTitle: string;
  periodDate: string;
  submittedAt: IsoDateString;
  answers: CheckInAnswer[];
  reviewedAt: IsoDateString | null;
  coachReply: string | null;
}

export interface InboxCheckInDto extends CheckInResponseDto {
  clientId: string;
  clientName: string;
  /** Client's latest logged bodyweight (kg, decimal string) on or before submission, if any. */
  bodyweightKg: string | null;
}

export interface CheckInInboxDto {
  responses: InboxCheckInDto[];
  unreviewed: number;
  templates: CheckInTemplateDto[];
  clients: { id: string; name: string }[];
}

export interface ReviewCheckInRequest {
  reply?: string;
  reviewed: boolean;
}

export interface DueCheckInDto {
  scheduleId: string;
  templateTitle: string;
  periodDate: string;
  questions: CheckInQuestionDto[];
}

export interface ClientCheckInsDto {
  due: DueCheckInDto[];
  recent: CheckInResponseDto[];
}

// ─── Pure rules (API and web share them) ───

const DAY_MS = 86_400_000;
const toDay = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const fromDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * The period a schedule accepts an answer for on `today` (`YYYY-MM-DD`, UTC), or null when nothing is open.
 * WEEKLY: the due weekday that falls within ±3 days of today (exactly one does), never before the start date.
 * ONCE: the due date, open from assignment until answered.
 */
export function openPeriod(
  schedule: { cadence: CheckInCadence; weekday: number | null; dueDate: string | null; startDate: string },
  today: string,
): string | null {
  if (schedule.cadence === CheckInCadence.ONCE) return schedule.dueDate;
  if (schedule.weekday === null) return null;
  const t = toDay(today);
  const dow = new Date(t).getUTCDay();
  // Signed offset to the nearest due weekday, in -3..3.
  const offset = ((schedule.weekday - dow + 10) % 7) - 3;
  const period = t + offset * DAY_MS;
  return period >= toDay(schedule.startDate) ? fromDay(period) : null;
}

export function validateCheckInTemplate(input: SaveCheckInTemplateRequest): string | null {
  if (!input.title.trim()) return 'Give the check-in a title.';
  if (input.questions.length === 0) return 'Add at least one question.';
  if (input.questions.length > CHECK_IN_LIMITS.maxQuestions) return `Use at most ${CHECK_IN_LIMITS.maxQuestions} questions.`;
  for (const [i, q] of input.questions.entries()) {
    if (!q.prompt.trim()) return `Question ${i + 1} needs a prompt.`;
    if (!Object.values(CheckInQuestionKind).includes(q.kind)) return `Question ${i + 1} has an unknown type.`;
  }
  return null;
}

/** Checks answers against the questions. Returns the snapshot to store, or an error message. */
export function resolveCheckInAnswers(
  questions: CheckInQuestionDto[],
  given: SubmitCheckInRequest['answers'],
): { answers: CheckInAnswer[] } | { error: string } {
  const byId = new Map(given.map((a) => [a.questionId, a.value]));
  const answers: CheckInAnswer[] = [];
  for (const q of questions) {
    const raw = byId.get(q.id)?.trim() || null;
    if (raw === null) {
      if (q.required) return { error: `Answer “${q.prompt}”.` };
    } else if (q.kind === CheckInQuestionKind.NUMBER) {
      if (!/^-?\d{1,6}(\.\d{1,2})?$/.test(raw)) return { error: `“${q.prompt}” needs a number.` };
    } else if (q.kind === CheckInQuestionKind.SCALE) {
      if (!/^[1-5]$/.test(raw)) return { error: `“${q.prompt}” needs a score from 1 to 5.` };
    } else if (raw.length > CHECK_IN_LIMITS.maxText) {
      return { error: `Keep “${q.prompt}” under ${CHECK_IN_LIMITS.maxText} characters.` };
    }
    answers.push({ questionId: q.id, prompt: q.prompt, kind: q.kind, unit: q.unit, value: raw });
  }
  return { answers };
}
