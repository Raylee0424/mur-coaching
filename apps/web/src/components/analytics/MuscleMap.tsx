'use client';

import clsx from 'clsx';
import { useMemo, useState } from 'react';
import type { MappedMuscle, MuscleAnalyticsDto, MuscleStatDto } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { TABLE, TD, TD_NUM, TH, THEAD, TR } from '@/components/ui/table';
import { BODY_REGIONS, LEGEND, VOLUME_RANGES, muscleLabel, muscleStatus, sortMuscles, type MapView, type SortKey } from './muscle-model';

const fmt = (n: number, d = 1): string => n.toLocaleString('en-US', { maximumFractionDigits: d });

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'muscle', label: 'Muscle group', numeric: false },
  { key: 'weeklyEffectiveSets', label: 'Effective sets / wk', numeric: true },
  { key: 'hardSets', label: 'Hard sets', numeric: true },
  { key: 'perWeek', label: 'Freq / wk', numeric: true },
  { key: 'tonnageKg', label: 'Tonnage (kg)', numeric: true },
];

/** Stitch anatomy heatmap + inspector + sortable table. The table is the accessible equivalent of the map. */
export function MuscleMap({ data }: { data: MuscleAnalyticsDto }) {
  const [view, setView] = useState<MapView>('volume');
  const [selected, setSelected] = useState<MappedMuscle | null>(() => sortMuscles(data.muscles, 'weeklyEffectiveSets', 'desc')[0]?.muscle ?? null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'weeklyEffectiveSets', dir: 'desc' });
  const byMuscle = useMemo(() => new Map(data.muscles.map((m) => [m.muscle, m])), [data.muscles]);
  const rows = sortMuscles(data.muscles, sort.key, sort.dir);
  const pick = selected ? byMuscle.get(selected) : undefined;

  function toggleSort(key: SortKey): void {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'muscle' ? 'asc' : 'desc' }));
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <section aria-labelledby="map-heading" className="flex flex-col gap-4 rounded-md border border-line bg-card p-5 lg:col-span-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="map-heading" className="font-display text-title-md text-ink">
              Anatomy Heatmap
            </h2>
            <p className="font-mono text-label-sm text-muted">
              {data.days}-day {view === 'volume' ? 'effective sets' : 'training frequency'}
            </p>
          </div>
          <div role="radiogroup" aria-label="Map metric" className="inline-flex gap-1 rounded-sm border border-line bg-canvas-low p-1">
            {(['volume', 'frequency'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => setView(v)}
                className={clsx('rounded-sm px-3 py-1 font-sans text-label-sm', view === v ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink')}
              >
                {v === 'volume' ? 'Weekly volume' : 'Frequency'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-sm border border-line bg-canvas-low p-4">
          {(['front', 'back'] as const).map((side) => (
            <div key={side} className="flex flex-col items-center gap-2">
              <span className="font-sans text-label-sm uppercase text-muted">{side}</span>
              <svg viewBox="0 0 160 280" className="h-64 w-36" role="group" aria-label={`${side === 'front' ? 'Front' : 'Back'} muscle map`}>
                <circle cx="80" cy="24" r="14" className="fill-raised stroke-line-strong" aria-hidden="true" />
                {BODY_REGIONS[side].map(({ muscle, shapes }) => {
                  const stat = byMuscle.get(muscle);
                  if (!stat) return null;
                  const status = muscleStatus(stat, view);
                  const on = selected === muscle;
                  return (
                    <g
                      key={muscle}
                      role="button"
                      tabIndex={0}
                      aria-pressed={on}
                      aria-label={`${muscleLabel(muscle)}: ${fmt(stat.weeklyEffectiveSets)} effective sets per week, ${fmt(stat.perWeek)} sessions per week, ${status.label}`}
                      onClick={() => setSelected(muscle)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelected(muscle);
                        }
                      }}
                      className={clsx('cursor-pointer outline-none transition-opacity [&:focus-visible>*]:stroke-primary', status.fill, on ? 'opacity-100' : 'opacity-80 hover:opacity-100')}
                    >
                      {shapes.map((s, i) =>
                        'points' in s ? (
                          <polygon key={i} points={s.points} strokeWidth={2} className={on ? 'stroke-ink' : 'stroke-transparent'} />
                        ) : (
                          <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={5} strokeWidth={2} className={on ? 'stroke-ink' : 'stroke-transparent'} />
                        ),
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          ))}
        </div>

        <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-label-sm text-muted">
          {LEGEND[view].map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden="true">
                <circle cx="5" cy="5" r="5" className={s.fill} />
              </svg>
              {s.label}
              {view === 'volume' && s.key in VOLUME_RANGES ? ` (${VOLUME_RANGES[s.key as keyof typeof VOLUME_RANGES]})` : ''}
            </li>
          ))}
        </ul>

        {pick ? <Inspector stat={pick} view={view} /> : null}
      </section>

      <section aria-labelledby="table-heading" className="overflow-hidden rounded-md border border-line bg-card lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-5">
          <div>
            <h2 id="table-heading" className="font-display text-title-md text-ink">
              Muscle-Group Volume Breakdown
            </h2>
            <p className="text-label-md text-muted">Sort by any column. Select a row to inspect it on the map.</p>
          </div>
          <span className="font-mono text-label-sm text-primary">
            SORTED BY: {COLUMNS.find((c) => c.key === sort.key)?.label.toUpperCase()} {sort.dir === 'desc' ? '↓' : '↑'}
          </span>
        </div>
        <div className="relative overflow-x-auto">
          <table className={TABLE}>
            <caption className="sr-only">Per-muscle training volume over the last {data.days} days</caption>
            <thead className={THEAD}>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={clsx(TH, c.numeric && 'text-right')}>
                    <button type="button" onClick={() => toggleSort(c.key)} className={clsx('uppercase tracking-wider hover:text-ink', sort.key === c.key && 'text-primary')}>
                      {c.label}
                      {sort.key === c.key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                    </button>
                  </th>
                ))}
                <th scope="col" className={TH}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const status = muscleStatus(m, view);
                return (
                  <tr key={m.muscle} className={clsx(TR, selected === m.muscle && 'bg-raised')}>
                    <th scope="row" className={clsx(TD, 'text-left font-normal')}>
                      <button type="button" onClick={() => setSelected(m.muscle)} aria-pressed={selected === m.muscle} className="text-ink hover:text-primary">
                        {muscleLabel(m.muscle)}
                      </button>
                    </th>
                    <td className={clsx(TD_NUM, m.band === 'PRODUCTIVE' || m.band === 'HIGH' ? 'text-primary' : 'text-ink')}>{fmt(m.weeklyEffectiveSets)}</td>
                    <td className={clsx(TD_NUM, 'text-muted')}>{fmt(m.hardSets)}</td>
                    <td className={clsx(TD_NUM, 'text-ink')}>{fmt(m.perWeek)}×</td>
                    <td className={clsx(TD_NUM, 'text-muted')}>{fmt(Number(m.tonnageKg), 0)}</td>
                    <td className={TD}>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Inspector({ stat, view }: { stat: MuscleStatDto; view: MapView }) {
  const status = muscleStatus(stat, view);
  const items = [
    ['Effective / wk', fmt(stat.weeklyEffectiveSets)],
    ['Hard sets', fmt(stat.hardSets)],
    ['Sessions', `${stat.sessions} (${fmt(stat.perWeek)}×/wk)`],
    ['Tonnage', `${fmt(Number(stat.tonnageKg), 0)} kg`],
  ];
  return (
    <div aria-live="polite" className="flex flex-col gap-3 rounded-sm border border-primary/40 bg-canvas-low p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-title-md text-ink">{muscleLabel(stat.muscle)}</p>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 font-mono text-label-sm">
        {items.map(([k, v]) => (
          <div key={k}>
            <dt className="uppercase text-muted">{k}</dt>
            <dd className="text-title-md text-ink tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
