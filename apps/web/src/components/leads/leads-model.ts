import { LEAD_BOARD_STAGES, LeadStage } from '@coaching/shared';
import type { LeadDto } from '@coaching/shared';

export interface BoardColumn {
  stage: LeadStage;
  leads: LeadDto[];
}

/** Board columns in order, each newest first. Lost leads are listed apart. */
export function boardColumns(leads: readonly LeadDto[]): { columns: BoardColumn[]; lost: LeadDto[] } {
  const newestFirst = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    columns: LEAD_BOARD_STAGES.map((stage) => ({ stage, leads: newestFirst.filter((l) => l.stage === stage) })),
    lost: newestFirst.filter((l) => l.stage === LeadStage.LOST),
  };
}

/** "5m ago", "2h ago", "3d ago". Anything under a minute is "just now". */
export function ageLabel(iso: string, nowMs: number = Date.now()): string {
  const minutes = Math.floor((nowMs - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Card subtitle: "Powerbuilding · 3y exp · 4d/wk"; skips what the lead did not give. */
export function leadSummary(lead: Pick<LeadDto, 'goal' | 'experienceYears' | 'trainingDays'>): string {
  return [
    lead.goal,
    lead.experienceYears != null ? `${lead.experienceYears}y exp` : null,
    lead.trainingDays != null ? `${lead.trainingDays}d/wk` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Stages a coach may move a lead to by hand: never ACTIVE (set by invite acceptance). */
export function movableStages(stage: LeadStage): LeadStage[] {
  if (stage === LeadStage.ACTIVE) return [];
  return [LeadStage.NEW, LeadStage.INTAKE_SENT, LeadStage.CALL_BOOKED, LeadStage.LOST];
}
