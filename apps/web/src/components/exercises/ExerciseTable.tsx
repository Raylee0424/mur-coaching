import { Fragment } from 'react';
import Link from 'next/link';
import { MUSCLE_GROUP_LABELS } from '@coaching/shared';
import type { ExerciseDto } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatKg } from '@/lib/format';
import { ExerciseForm } from './ExerciseForm';

interface Props {
  exercises: ExerciseDto[];
  /** Coach whose custom exercises are editable. */
  coachId: string;
  editId: string | undefined;
  /** URL of this page with filters but without `edit`. */
  baseHref: string;
}

function editHref(baseHref: string, id: string): string {
  return `${baseHref}${baseHref.includes('?') ? '&' : '?'}edit=${encodeURIComponent(id)}`;
}

export function ExerciseTable({ exercises, coachId, editId, baseHref }: Props) {
  if (exercises.length === 0) return <EmptyState title="No exercises match">Try clearing the filters.</EmptyState>;
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Exercise library</caption>
        <thead className="border-b border-line bg-raised text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">Exercise</th>
            <th scope="col" className="px-4 py-2 font-semibold">Muscle group</th>
            <th scope="col" className="px-4 py-2 font-semibold">Equipment</th>
            <th scope="col" className="px-4 py-2 font-semibold">Increment</th>
            <th scope="col" className="px-4 py-2 font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise) => {
            const custom = exercise.coachId !== null;
            const editable = exercise.coachId === coachId;
            return (
              <Fragment key={exercise.id}>
                <tr className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold">{exercise.name}</td>
                  <td className="px-4 py-3">{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</td>
                  <td className="px-4 py-3">{exercise.equipment || '—'}</td>
                  <td className="px-4 py-3">{formatKg(exercise.loadIncrementKg)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Badge tone={custom ? 'indigo' : 'slate'}>{custom ? 'Custom' : 'Global'}</Badge>
                      {editable ? (
                        <Link
                          href={editHref(baseHref, exercise.id)}
                          className="font-semibold text-primary-soft underline-offset-2 hover:underline"
                        >
                          Edit
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {editable && editId === exercise.id ? (
                  <tr className="border-b border-line bg-canvas-low">
                    <td colSpan={5} className="px-4 py-4">
                      <ExerciseForm mode="edit" exercise={exercise} returnTo={baseHref} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
