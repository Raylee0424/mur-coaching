'use client';

import clsx from 'clsx';
import { ArrowLeft, FileUp } from 'lucide-react';
import { useState, useTransition } from 'react';
import { IMPORT_LIMITS, IMPORT_SOURCES } from '@coaching/shared';
import type { ImportPreviewDto, ImportSource, WeightUnit } from '@coaching/shared';
import { commitImport, previewImport } from '@/actions/data';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { initialChoices, mappingsFrom, setsSkipped, SOURCE_ORDER } from './import-model';

interface Pending {
  source: ImportSource;
  fileName: string;
  csv: string;
  weightUnit: WeightUnit;
  preview: ImportPreviewDto;
}

/**
 * Import wizard (`athlete_web_data_import_export_ecosystem_sync`, importer cards): pick a source, choose its CSV,
 * review the preview (duplicates, skipped rows), map unmatched exercises, then commit. Every step is undoable from
 * the history list.
 */
export function ImportWizard({
  exercises,
  lastBySource,
  defaultUnit,
}: {
  exercises: { id: string; name: string }[];
  lastBySource: Partial<Record<ImportSource, string>>;
  defaultUnit: WeightUnit;
}) {
  const toast = useToast();
  const [active, setActive] = useState<ImportSource | null>(null);
  const [unit, setUnit] = useState<WeightUnit>(defaultUnit);
  const [pendingImport, setPendingImport] = useState<Pending | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, start] = useTransition();

  function reset(): void {
    setActive(null);
    setPendingImport(null);
    setError(undefined);
  }

  function onFile(source: ImportSource, file: File | undefined): void {
    if (!file) return;
    if (file.size > IMPORT_LIMITS.maxCsvBytes) return setError('That file is larger than 5 MB. Export a shorter date range.');
    setError(undefined);
    start(async () => {
      const csv = await file.text();
      const res = await previewImport({ source, csv, weightUnit: unit });
      if (!res.ok) return setError(res.error);
      setPendingImport({ source, fileName: file.name, csv, weightUnit: unit, preview: res.data });
      setChoices(initialChoices(res.data.exercises));
    });
  }

  function commit(): void {
    if (!pendingImport) return;
    const p = pendingImport;
    start(async () => {
      const res = await commitImport({ source: p.source, csv: p.csv, weightUnit: p.weightUnit, fileName: p.fileName, mappings: mappingsFrom(p.preview.exercises, choices) });
      if (!res.ok) return setError(res.error);
      toast.show({
        message: res.data.duplicate ? 'This file was already imported. Nothing new was added.' : `Imported ${res.data.job.createdCount} ${p.preview.kind === 'WORKOUTS' ? 'sessions' : 'entries'}`,
        tone: 'ok',
      });
      reset();
    });
  }

  if (pendingImport) {
    const { preview } = pendingImport;
    const meta = IMPORT_SOURCES[pendingImport.source];
    const newUnits = preview.units - preview.duplicateUnits;
    const unmatched = preview.exercises.filter((e) => !choices[e.sourceName]).length;
    return (
      <section aria-labelledby="preview-heading" className="space-y-5 rounded-md border border-line bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-mono text-label-sm uppercase text-primary">{`${meta.label} · PREVIEW`}</span>
            <h2 id="preview-heading" className="mt-0.5 font-display text-title-lg text-ink">
              {pendingImport.fileName}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
            <Icon icon={ArrowLeft} size={16} /> Choose another file
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['ROWS READ', preview.rowCount],
            [preview.kind === 'WORKOUTS' ? 'SESSIONS' : 'ENTRIES', preview.units],
            ['ALREADY IMPORTED', preview.duplicateUnits],
            ['ROWS SKIPPED', preview.skippedRows],
          ].map(([k, v]) => (
            <div key={k} className="rounded-sm border border-line bg-canvas-low p-3">
              <dt className="font-mono text-label-sm text-muted">{k}</dt>
              <dd className="font-display text-title-lg tabular-nums text-ink">{Number(v).toLocaleString('en-US')}</dd>
            </div>
          ))}
        </dl>

        {preview.alreadyImported ? (
          <p role="status" className="rounded-sm border border-amber/40 bg-amber/10 px-4 py-3 text-ui text-ink">
            You already imported this exact file. Importing again changes nothing; roll back the earlier import first to redo it.
          </p>
        ) : null}
        {preview.warnings.map((w) => (
          <p key={w} className="text-label-md text-muted">
            {w}
          </p>
        ))}

        {preview.kind === 'WORKOUTS' ? (
          <div className="space-y-3">
            <h3 className="font-display text-title-md text-ink">Exercise mapping</h3>
            <p className="text-label-md text-muted">
              Matched names reuse your library. Pick an exercise for each unmatched name, or leave it on Skip to leave those sets out. Choices are remembered for
              next time.
            </p>
            <div className="relative overflow-x-auto rounded-sm border border-line">
              <table className={TABLE}>
                <thead className={THEAD}>
                  <tr>
                    <th scope="col" className={TH}>IN FILE</th>
                    <th scope="col" className={TH_NUM}>SETS</th>
                    <th scope="col" className={TH}>STATUS</th>
                    <th scope="col" className={TH}>MAPS TO</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.exercises.map((e, i) => (
                    <tr key={e.sourceName} className={TR}>
                      <td className={clsx(TD, 'text-ink')}>{e.sourceName}</td>
                      <td className={TD_NUM}>{e.sets}</td>
                      <td className={TD}>
                        {e.matchedBy === 'ALIAS' ? <Badge tone="emerald">Saved</Badge> : e.matchedBy === 'NAME' ? <Badge tone="emerald">Matched</Badge> : e.suggestion ? <Badge tone="amber">Suggested</Badge> : <Badge tone="red">Unmatched</Badge>}
                      </td>
                      <td className={TD}>
                        <label htmlFor={`map-${i}`} className="sr-only">{`Library exercise for ${e.sourceName}`}</label>
                        <Select id={`map-${i}`} value={choices[e.sourceName] ?? ''} onChange={(ev) => setChoices((c) => ({ ...c, [e.sourceName]: ev.target.value }))}>
                          <option value="">Skip these sets</option>
                          {exercises.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.sessions.length ? (
              <p className="font-mono text-label-sm text-muted">
                Newest: {preview.sessions.map((s) => `${formatDate(s.performedAt)} · ${s.title} (${s.sets} sets)`).join(' | ')}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="font-mono text-label-sm text-muted">Sample: {preview.meals.map((m) => `${m.date} · ${m.name} · ${m.kcal} kcal`).join(' | ')}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button onClick={commit} disabled={busy || preview.alreadyImported || newUnits === 0} aria-busy={busy}>
            {busy ? 'Importing…' : `Import ${newUnits.toLocaleString('en-US')} new ${preview.kind === 'WORKOUTS' ? 'sessions' : 'entries'}`}
          </Button>
          {preview.kind === 'WORKOUTS' && unmatched ? (
            <span className="text-label-md text-muted">{`${unmatched} skipped exercise${unmatched === 1 ? '' : 's'} · ${setsSkipped(preview.exercises, choices)} sets left out`}</span>
          ) : null}
          <FormError>{error}</FormError>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="importers-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="importers-heading" className="font-display text-title-lg text-ink">
            History Importers
          </h2>
          <p className="text-label-md text-muted">Bring workout logs and nutrition diaries over. Re-importing the same file is safe: duplicates are skipped.</p>
        </div>
        <Badge tone="signal">ZERO DATA LOCK-IN</Badge>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SOURCE_ORDER.map((source) => {
          const meta = IMPORT_SOURCES[source];
          const last = lastBySource[source];
          const id = `import-${source}`;
          return (
            <article key={source} className={clsx('flex flex-col justify-between gap-4 rounded-md border bg-card p-5', active === source ? 'border-primary' : 'border-line')}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-label-sm uppercase text-muted">{`${meta.kind} · CSV`}</span>
                  {last ? <Badge tone="emerald">{last}</Badge> : <Badge tone="slate">Ready</Badge>}
                </div>
                <h3 className="font-display text-title-md text-ink">{meta.label}</h3>
                <p className="text-label-md text-muted">{meta.blurb}</p>
              </div>
              {meta.kind === 'WORKOUTS' && active === source ? (
                <div>
                  <Label htmlFor={`${id}-unit`}>Weights in file (when not labelled)</Label>
                  <Select id={`${id}-unit`} value={unit} onChange={(e) => setUnit(e.target.value as WeightUnit)}>
                    <option value="KG">Kilograms</option>
                    <option value="LB">Pounds</option>
                  </Select>
                </div>
              ) : null}
              <input id={id} type="file" accept=".csv,text/csv" className="sr-only" disabled={busy} onChange={(e) => onFile(source, e.target.files?.[0])} onClick={() => setActive(source)} />
              <label
                htmlFor={id}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-canvas-low py-2 font-sans text-label-sm font-semibold text-primary transition-colors hover:border-primary focus-within:ring-2 focus-within:ring-primary"
              >
                <Icon icon={FileUp} size={16} />
                {busy && active === source ? 'Reading…' : `Import ${meta.label} CSV`}
              </label>
            </article>
          );
        })}
      </div>
      <FormError>{error}</FormError>
    </section>
  );
}
