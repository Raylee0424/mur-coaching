import { Equipment } from '@coaching/shared';
import type { ExerciseDto, MuscleGroup } from '@coaching/shared';

export interface PickerFilters {
  q: string;
  group: MuscleGroup | '';
  equipment: Equipment | '';
}

export function filterExercises(library: readonly ExerciseDto[], f: PickerFilters): ExerciseDto[] {
  const needle = f.q.trim().toLowerCase();
  return library.filter(
    (e) =>
      (!f.group || e.muscleGroup === f.group) &&
      (!f.equipment || e.equipment === f.equipment) &&
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

/** Equipment present in the library, in enum order. */
export function equipmentOptions(library: readonly ExerciseDto[]): Equipment[] {
  const present = new Set(library.map((e) => e.equipment));
  return Object.values(Equipment).filter((eq) => present.has(eq));
}
