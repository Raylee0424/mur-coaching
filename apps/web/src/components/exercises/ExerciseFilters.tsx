import Link from 'next/link';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '@coaching/shared';
import { buttonClass } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Field';

/** Plain GET form: the server re-renders with the new search params. */
export function ExerciseFilters({ q, muscleGroup }: { q: string; muscleGroup: string }) {
  return (
    <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <Label htmlFor="filter-q">Search</Label>
        <Input id="filter-q" name="q" type="search" defaultValue={q} placeholder="e.g. bench" />
      </div>
      <div className="min-w-44">
        <Label htmlFor="filter-muscle">Muscle group</Label>
        <Select id="filter-muscle" name="muscleGroup" defaultValue={muscleGroup}>
          <option value="">All</option>
          {Object.values(MuscleGroup).map((group) => (
            <option key={group} value={group}>
              {MUSCLE_GROUP_LABELS[group]}
            </option>
          ))}
        </Select>
      </div>
      <button type="submit" className={buttonClass('primary')}>
        Filter
      </button>
      {q || muscleGroup ? (
        <Link href="/coach/exercises" className={buttonClass('secondary')}>
          Clear
        </Link>
      ) : null}
    </form>
  );
}
