import clsx from 'clsx';
import { blockForWeek } from '@coaching/shared';
import type { SharedProgramDto } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { blockTone } from './periodization-model';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const repText = (min: number, max: number): string => (min === max ? String(min) : `${min}–${max}`);

/** Read-only plan for the public preview link: blocks, week strip, then each week's days and prescriptions. */
export function SharedProgramView({ program }: { program: SharedProgramDto }) {
  const weeks = Array.from({ length: program.durationWeeks }, (_, i) => i + 1);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="font-mono text-micro uppercase text-muted">Program preview · by {program.coachName}</p>
        <h1 className="font-display text-h1">{program.name}</h1>
        {program.description ? <p className="max-w-prose text-body text-muted">{program.description}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{program.durationWeeks} {program.durationWeeks === 1 ? 'week' : 'weeks'}</Badge>
          {program.sports.map((s) => (
            <Badge key={s.id} tone="slate">
              {s.name}
            </Badge>
          ))}
        </div>
      </header>

      {program.mesocycles.length > 0 ? (
        <section aria-labelledby="blocks-heading" className="space-y-3">
          <h2 id="blocks-heading" className="font-mono text-micro uppercase text-muted">
            Training blocks
          </h2>
          <ol className="flex flex-wrap gap-1" aria-label="Weeks by block">
            {weeks.map((w) => {
              const b = blockForWeek(program.mesocycles, w);
              const index = b ? program.mesocycles.indexOf(b.meso) : -1;
              const label = `Week ${w}${b ? `, ${b.meso.name}${b.micro ? `, ${b.micro.label}` : ''}${b.micro?.isDeload ? ', deload' : ''}` : ''}`;
              return (
                <li
                  key={w}
                  aria-label={label}
                  title={label}
                  className={clsx(
                    'flex h-7 min-w-7 items-center justify-center rounded-sm px-1 font-mono text-micro',
                    index >= 0 ? blockTone(index) : 'bg-canvas-low text-faint',
                    b?.micro?.isDeload ? 'underline decoration-2 underline-offset-2' : '',
                  )}
                >
                  {w}
                </li>
              );
            })}
          </ol>
          <ul className="grid gap-3 md:grid-cols-2">
            {program.mesocycles.map((m, i) => (
              <li key={m.id}>
                <Card className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className={clsx('size-3 rounded-sm', blockTone(i).split(' ')[0])} />
                    <h3 className="text-ui font-semibold">{m.name}</h3>
                    <span className="font-mono text-micro text-faint">
                      Weeks {m.startWeek}–{m.endWeek}
                    </span>
                  </div>
                  {m.focus ? <p className="text-ui text-muted">{m.focus}</p> : null}
                  {m.microcycles.length > 0 ? (
                    <ul className="space-y-1 text-meta text-muted">
                      {m.microcycles.map((c) => (
                        <li key={c.id}>
                          <span className="text-ink">{c.label}</span> · W{c.startWeek}
                          {c.endWeek !== c.startWeek ? `–${c.endWeek}` : ''}
                          {c.rpeMin || c.rpeMax ? ` · RPE ${c.rpeMin ?? c.rpeMax}${c.rpeMin && c.rpeMax && c.rpeMin !== c.rpeMax ? `–${c.rpeMax}` : ''}` : ''}
                          {c.volumeDeltaPct !== null ? ` · ${c.volumeDeltaPct > 0 ? '+' : ''}${c.volumeDeltaPct}% volume` : ''}
                          {c.isDeload ? ' · deload' : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="weeks-heading" className="space-y-3">
        <h2 id="weeks-heading" className="font-mono text-micro uppercase text-muted">
          Week by week
        </h2>
        {weeks.map((w) => {
          const days = program.workouts.filter((d) => d.weekNumber === w);
          const b = blockForWeek(program.mesocycles, w);
          return (
            <details key={w} open={w === 1} className="rounded-md border border-line bg-card">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-ui">
                <span className="font-mono">Week {w}</span>
                <span className="truncate text-meta text-muted">
                  {b ? `${b.meso.name}${b.micro ? ` · ${b.micro.label}` : ''}` : ''}
                  {days.length === 0 ? ' · rest' : ` · ${days.length} ${days.length === 1 ? 'day' : 'days'}`}
                </span>
              </summary>
              {days.length > 0 ? (
                <div className="grid gap-3 border-t border-line p-4 md:grid-cols-2">
                  {days.map((d) => (
                    <div key={d.dayNumber} className="space-y-2">
                      <h3 className="text-ui font-semibold">
                        <span className="font-mono text-micro text-faint">{DAY_NAMES[d.dayNumber - 1] ?? `Day ${d.dayNumber}`}</span> {d.name}
                      </h3>
                      <ul className="divide-y divide-line rounded-md border border-line">
                        {d.exercises.map((e, i) => (
                          <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2 text-ui">
                            <span>{e.name}</span>
                            <span className="shrink-0 font-mono text-meta text-muted">
                              {e.sets} × {repText(e.repsMin, e.repsMax)}
                              {e.rpe ? ` @ ${Number(e.rpe)}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </details>
          );
        })}
      </section>
    </div>
  );
}
