import type { IsoDateString } from './common';

// String-literal enums mirror the Prisma enums of the same name.

export const LeadStage = { NEW: 'NEW', INTAKE_SENT: 'INTAKE_SENT', CALL_BOOKED: 'CALL_BOOKED', ACTIVE: 'ACTIVE', LOST: 'LOST' } as const;
export type LeadStage = (typeof LeadStage)[keyof typeof LeadStage];

/** Board column order. LOST is a closed state shown apart from the board. */
export const LEAD_BOARD_STAGES: readonly LeadStage[] = [LeadStage.NEW, LeadStage.INTAKE_SENT, LeadStage.CALL_BOOKED, LeadStage.ACTIVE];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New lead',
  INTAKE_SENT: 'Intake sent',
  CALL_BOOKED: 'Call booked',
  ACTIVE: 'Active client',
  LOST: 'Lost',
};

export const LeadSource = { WEB_FORM: 'WEB_FORM', MANUAL: 'MANUAL' } as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = { WEB_FORM: 'Web form', MANUAL: 'Added by hand' };

export const INTAKE_LIMITS = {
  maxQuestions: 10,
  maxLabel: 160,
  maxOptions: 8,
  maxOption: 60,
  maxAnswer: 1000,
  maxHeadline: 120,
  maxIntro: 500,
  maxNotes: 2000,
  maxMonthlyValueCents: 1_000_000,
} as const;

export const IntakeQuestionType = { TEXT: 'TEXT', CHOICE: 'CHOICE' } as const;
export type IntakeQuestionType = (typeof IntakeQuestionType)[keyof typeof IntakeQuestionType];

/** A coach-defined question that follows the fixed intake fields. */
export interface IntakeQuestion {
  /** Stable key for answers; generated when the question is added. */
  id: string;
  label: string;
  required: boolean;
  type: IntakeQuestionType;
  /** CHOICE only: the answer must be one of these. */
  options?: string[];
}

export interface IntakeAnswerInput {
  questionId: string;
  answer: string;
}

/** What the coach edits: brand identity plus the custom questions. */
export interface IntakeFormDto {
  slug: string;
  headline: string;
  intro: string;
  acceptingLeads: boolean;
  questions: IntakeQuestion[];
}

export interface SaveIntakeFormRequest {
  slug: string;
  headline: string;
  intro: string;
  acceptingLeads: boolean;
  questions: IntakeQuestion[];
}

/** Public form as a visitor sees it. */
export interface PublicIntakeDto {
  coachName: string;
  headline: string;
  intro: string;
  questions: IntakeQuestion[];
}

export interface SubmitIntakeRequest {
  name: string;
  email: string;
  phone?: string;
  goal?: string;
  trainingDays?: number;
  experienceYears?: number;
  answers: IntakeAnswerInput[];
  /** Honeypot. Real visitors never fill it in; a bot that does gets a silent success and no lead. */
  website?: string;
}

export interface LeadAnswerDto {
  question: string;
  answer: string;
}

export interface LeadDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  goal: string | null;
  trainingDays: number | null;
  experienceYears: number | null;
  source: LeadSource;
  stage: LeadStage;
  monthlyValueCents: number | null;
  callAt: IsoDateString | null;
  notes: string | null;
  /** An unexpired, unaccepted invite exists for this lead. */
  invitePending: boolean;
  convertedClientId: string | null;
  convertedAt: IsoDateString | null;
  createdAt: IsoDateString;
  /** Newest submission first; empty for hand-added leads. */
  answers: LeadAnswerDto[];
}

export interface LeadStatsDto {
  /** Leads still in play (NEW, INTAKE_SENT, CALL_BOOKED). */
  open: number;
  /** Sum of the monthly value on open leads. */
  pipelineCents: number;
  /** ACTIVE / (ACTIVE + LOST) as a whole percent; null while no lead is decided. */
  conversionPct: number | null;
  /** Mean days from first contact to conversion; null with no conversions. */
  avgDaysToConvert: number | null;
}

export interface LeadBoardDto {
  leads: LeadDto[];
  stats: LeadStatsDto;
  /** Null until the coach saves the form once; then `/apply/<slug>`. */
  applyPath: string | null;
  acceptingLeads: boolean;
}

export interface CreateLeadRequest {
  name: string;
  email: string;
  phone?: string;
  goal?: string;
  monthlyValueCents?: number;
}

export interface UpdateLeadRequest {
  stage?: LeadStage;
  notes?: string | null;
  monthlyValueCents?: number | null;
  callAt?: IsoDateString | null;
}

/** Slugs are public URLs: lowercase letters, digits and single hyphens. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_LIMITS = { min: 3, max: 40 } as const;

/** Lowercase, hyphenated, trimmed to the slug limit. May come out too short; callers check. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_LIMITS.max)
    .replace(/-+$/g, '');
}

/** First problem with a coach's question list, or null. */
export function validateIntakeQuestions(questions: readonly IntakeQuestion[]): string | null {
  if (questions.length > INTAKE_LIMITS.maxQuestions) return `At most ${INTAKE_LIMITS.maxQuestions} questions.`;
  const seen = new Set<string>();
  for (const q of questions) {
    if (!q.id || seen.has(q.id)) return 'Each question needs a unique id.';
    seen.add(q.id);
    if (!q.label.trim()) return 'Every question needs text.';
    if (q.label.length > INTAKE_LIMITS.maxLabel) return `Question text is at most ${INTAKE_LIMITS.maxLabel} characters.`;
    if (q.type === IntakeQuestionType.CHOICE) {
      const options = (q.options ?? []).map((o) => o.trim());
      if (options.length < 2) return `"${q.label}" needs at least two options.`;
      if (options.length > INTAKE_LIMITS.maxOptions) return `"${q.label}" has too many options.`;
      if (options.some((o) => !o || o.length > INTAKE_LIMITS.maxOption)) return `"${q.label}" has an empty or overlong option.`;
      if (new Set(options).size !== options.length) return `"${q.label}" repeats an option.`;
    }
  }
  return null;
}

/**
 * Checks a visitor's answers against the form and returns the labelled pairs to store, or an error message.
 * Unknown question ids are ignored; blank optional answers are dropped.
 */
export function resolveIntakeAnswers(
  questions: readonly IntakeQuestion[],
  answers: readonly IntakeAnswerInput[],
): { ok: true; answers: LeadAnswerDto[] } | { ok: false; error: string } {
  const byId = new Map(answers.map((a) => [a.questionId, a.answer.trim()]));
  const resolved: LeadAnswerDto[] = [];
  for (const q of questions) {
    const answer = byId.get(q.id) ?? '';
    if (!answer) {
      if (q.required) return { ok: false, error: `Answer "${q.label}".` };
      continue;
    }
    if (answer.length > INTAKE_LIMITS.maxAnswer) return { ok: false, error: `"${q.label}": at most ${INTAKE_LIMITS.maxAnswer} characters.` };
    if (q.type === IntakeQuestionType.CHOICE && !(q.options ?? []).includes(answer)) return { ok: false, error: `"${q.label}": pick one of the options.` };
    resolved.push({ question: q.label, answer });
  }
  return { ok: true, answers: resolved };
}

/** Board numbers. Pure so the API and tests agree. */
export function leadStats(
  leads: readonly { stage: LeadStage; monthlyValueCents: number | null; createdAt: IsoDateString; convertedAt: IsoDateString | null }[],
): LeadStatsDto {
  const open = leads.filter((l) => l.stage === LeadStage.NEW || l.stage === LeadStage.INTAKE_SENT || l.stage === LeadStage.CALL_BOOKED);
  const won = leads.filter((l) => l.stage === LeadStage.ACTIVE);
  const lost = leads.filter((l) => l.stage === LeadStage.LOST);
  const decided = won.length + lost.length;
  const days = won
    .filter((l) => l.convertedAt)
    .map((l) => (Date.parse(l.convertedAt as string) - Date.parse(l.createdAt)) / 86_400_000);
  return {
    open: open.length,
    pipelineCents: open.reduce((sum, l) => sum + (l.monthlyValueCents ?? 0), 0),
    conversionPct: decided === 0 ? null : Math.round((won.length / decided) * 100),
    avgDaysToConvert: days.length === 0 ? null : Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10,
  };
}
