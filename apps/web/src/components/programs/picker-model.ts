import type { ExerciseDto, MuscleGroup } from '@coaching/shared';

export interface PickerFilters {
  q: string;
  group: MuscleGroup | '';
  equipment: string;
}

export function filterExercises(library: readonly ExerciseDto[], f: PickerFilters): ExerciseDto[] {
  const needle = f.q.trim().toLowerCase();
  return library.filter(
    (e) =>
      (!f.group || e.muscleGroup === f.group) &&
      (!f.equipment || (e.equipment ?? '').toLowerCase() === f.equipment.toLowerCase()) &&
      (!needle || e.name.toLowerCase().includes(needle)),
  );
}

/** Muscle groups present in the library, in enum order, with their counts (for the chip row). */
export function groupCounts(library: readonly ExerciseDto[], order: readonly MuscleGroup[]): { group: MuscleGroup; count: number }[] {
  return order.flatMap((group) => {
    const count = library.filter((e) => e.muscleGroup === group).length;
    return count > 0 ? [{ group, count }] : [];
  });
}

/** Distinct equipment labels, sorted, case-insensitively de-duplicated. */
export function equipmentOptions(library: readonly ExerciseDto[]): string[] {
  const seen = new Map<string, string>();
  for (const e of library) {
    const label = e.equipment?.trim();
    if (label && !seen.has(label.toLowerCase())) seen.set(label.toLowerCase(), label);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
