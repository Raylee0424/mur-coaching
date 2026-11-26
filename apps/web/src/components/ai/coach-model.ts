import { PROGRESSION_ACTION_LABEL } from '@coaching/shared';
import type { AiCitation, AiMessageDto } from '@coaching/shared';

export const ACTION_TEXT = PROGRESSION_ACTION_LABEL;

/** Where a citation opens: engine calls go to the logger (where the target is used), PRs to records, sessions to history. */
export function citationHref(c: AiCitation): string {
  if (c.kind === 'ENGINE') return '/client/log';
  if (c.kind === 'PR') return '/client/records';
  return '/client/history';
}

/** Citations of the newest assistant answer, for the inspector rail. */
export function latestCitations(messages: readonly AiMessageDto[]): AiCitation[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role === 'ASSISTANT') return m.citations;
  }
  return [];
}
