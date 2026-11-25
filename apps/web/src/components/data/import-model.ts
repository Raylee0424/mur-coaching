import type { ExerciseMatchDto, ImportMapping, ImportSource } from '@coaching/shared';

export const SOURCE_ORDER: readonly ImportSource[] = ['STRONG', 'HEVY', 'MACROFACTOR', 'MYFITNESSPAL'];

/** Starting choice per exercise: its match, else the suggestion, else skip (''). */
export function initialChoices(matches: readonly ExerciseMatchDto[]): Record<string, string> {
  return Object.fromEntries(matches.map((m) => [m.sourceName, m.exerciseId ?? m.suggestion?.id ?? '']));
}

/** Sends every choice that differs from the server's own match, so new aliases are saved and skips are explicit. */
export function mappingsFrom(matches: readonly ExerciseMatchDto[], choices: Readonly<Record<string, string>>): ImportMapping[] {
  return matches
    .filter((m) => (choices[m.sourceName] ?? '') !== (m.exerciseId ?? ''))
    .map((m) => ({ sourceName: m.sourceName, exerciseId: choices[m.sourceName] || null }));
}

export function setsSkipped(matches: readonly ExerciseMatchDto[], choices: Readonly<Record<string, string>>): number {
  return matches.filter((m) => !choices[m.sourceName]).reduce((n, m) => n + m.sets, 0);
}
