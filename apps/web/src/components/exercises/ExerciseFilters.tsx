import Link from 'next/link';
import { EQUIPMENT_LABELS, Equipment, MUSCLE_GROUP_LABELS, MuscleGroup, RESISTANCE_PROFILE_LABELS, ResistanceProfile } from '@coaching/shared';
import type { ListExercisesQuery } from '@coaching/shared';
import { buttonClass } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { firstParam } from '@/lib/form';

type Params = Record<string, string | string[] | undefined>;

const oneOf = <T extends string>(values: Record<string, T>, raw: string | undefined): T | undefined =>
  raw && (Object.values(values) as string[]).includes(raw) ? (raw as T) : undefined;

/** Reads the faceted-search params; anything invalid is dropped. */
export function parseExerciseFilters(params: Params): ListExercisesQuery & { q: string } {
  const q = firstParam(params.q)?.trim() ?? '';
  const muscleGroup = oneOf(MuscleGroup, firstParam(params.muscleGroup));
  const equipment = oneOf(Equipment, firstParam(params.equipment));
  const profile = oneOf(ResistanceProfile, firstParam(params.profile));
  return { q, ...(muscleGroup ? { muscleGroup } : {}), ...(equipment ? { equipment } : {}), ...(profile ? { profile } : {}) };
}

export const hasExerciseFilters = (f: ListExercisesQuery): boolean => Boolean(f.q || f.muscleGroup || f.equipment || f.profile);

/** Plain GET form: the server re-renders with the new search params. `hidden` keeps other params (e.g. the tab). */
export function ExerciseFilters({ filters, basePath, hidden = {} }: { filters: ListExercisesQuery; basePath: string; hidden?: Record<string, string> }) {
  const clearHref = Object.keys(hidden).length > 0 ? `${basePath}?${new URLSearchParams(hidden).toString()}` : basePath;
  return (
    <form method="get" action={basePath} role="search" className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="w-full sm:w-56">
        <label htmlFor="filter-q" className="sr-only">
          Search exercises
        </label>
        <Input id="filter-q" name="q" type="search" defaultValue={filters.q ?? ''} placeholder="Search exercises" />
      </div>
      <div className="w-full min-[420px]:w-40">
        <label htmlFor="filter-muscle" className="sr-only">
          Muscle
        </label>
        <Select id="filter-muscle" name="muscleGroup" defaultValue={filters.muscleGroup ?? ''}>
          <option value="">All muscles</option>
          {Object.values(MuscleGroup).map((group) => (
            <option key={group} value={group}>
              {MUSCLE_GROUP_LABELS[group]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full min-[420px]:w-44">
        <label htmlFor="filter-equipment" className="sr-only">
          Equipment
        </label>
        <Select id="filter-equipment" name="equipment" defaultValue={filters.equipment ?? ''}>
          <option value="">All equipment</option>
          {Object.values(Equipment).map((eq) => (
            <option key={eq} value={eq}>
              {EQUIPMENT_LABELS[eq]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full min-[420px]:w-40">
        <label htmlFor="filter-profile" className="sr-only">
          Resistance profile
        </label>
        <Select id="filter-profile" name="profile" defaultValue={filters.profile ?? ''}>
          <option value="">Any profile</option>
          {Object.values(ResistanceProfile).map((p) => (
            <option key={p} value={p}>
              {RESISTANCE_PROFILE_LABELS[p]}
            </option>
          ))}
        </Select>
      </div>
      <button type="submit" className={buttonClass('secondary', undefined, 'md')}>
        Filter
      </button>
      {hasExerciseFilters(filters) ? (
        <Link href={clearHref} className={buttonClass('ghost', undefined, 'md')}>
          Clear
        </Link>
      ) : null}
    </form>
  );
}
