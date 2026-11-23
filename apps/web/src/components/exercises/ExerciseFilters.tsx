import Link from 'next/link';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '@coaching/shared';
import { buttonClass } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';

/** Plain GET form: the server re-renders with the new search params. */
export function ExerciseFilters({ q, muscleGroup }: { q: string; muscleGroup: string }) {
  return (
    <form method="get" role="search" className="mb-4 flex flex-wrap items-center gap-2">
      <div className="w-full sm:w-64">
        <label htmlFor="filter-q" className="sr-only">
          Search exercises
        </label>
        <Input id="filter-q" name="q" type="search" defaultValue={q} placeholder="Search exercises" />
      </div>
      <div className="w-44">
        <label htmlFor="filter-muscle" className="sr-only">
          Muscle group
        </label>
        <Select id="filter-muscle" name="muscleGroup" defaultValue={muscleGroup}>
          <option value="">All muscle groups</option>
          {Object.values(MuscleGroup).map((group) => (
            <option key={group} value={group}>
              {MUSCLE_GROUP_LABELS[group]}
            </option>
          ))}
        </Select>
      </div>
      <button type="submit" className={buttonClass('secondary', undefined, 'md')}>
        Filter
      </button>
      {q || muscleGroup ? (
        <Link href="/coach/exercises" className={buttonClass('ghost', undefined, 'md')}>
          Clear
        </Link>
      ) : null}
    </form>
  );
}
