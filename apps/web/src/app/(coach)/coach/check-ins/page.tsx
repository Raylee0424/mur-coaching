import clsx from 'clsx';
import Link from 'next/link';
import { CHECK_IN_KIND_LABELS, Role, summarizeBodyweight } from '@coaching/shared';
import type { CheckInInboxDto, WeightUnit } from '@coaching/shared';
import { PhotoCompare } from '@/components/body/PhotoCompare';
import { answerText, filterInbox, parseCheckInTab, parseInboxFilter, scheduleLabel, timeAgo, type CheckInTab, type InboxFilter } from '@/components/check-ins/check-ins-model';
import { ReviewPanel } from '@/components/check-ins/ReviewPanel';
import { AssignCheckIn, DeleteTemplateButton, UnassignButton } from '@/components/check-ins/TemplateActions';
import { TemplateEditor } from '@/components/check-ins/TemplateEditor';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Label, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatStrip } from '@/components/ui/StatStrip';
import { bodyApi, checkInsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';
import { formatDate } from '@/lib/format';
import { formatWeight } from '@/lib/units';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const day = (iso: string): string => formatDate(`${iso}T00:00:00Z`);

const TABS: { key: CheckInTab; label: string }[] = [
  { key: 'inbox', label: 'Unified Inbox' },
  { key: 'builder', label: 'Questionnaire Builder' },
  { key: 'photos', label: 'Progress Photos' },
];

export default async function CoachCheckInsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.COACH);
  const [inbox, params] = await Promise.all([checkInsApi.inbox(), searchParams]);
  const tab = parseCheckInTab(firstParam(params.tab));

  return (
    <>
      <PageHeader
        title="Check-ins, Unified Inbox & Progress Photos"
        meta={`${inbox.unreviewed} to review`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <nav aria-label="Check-in sections" className="inline-flex gap-1 rounded-sm border border-line bg-canvas-low p-1">
              {TABS.map((t) => {
                const on = t.key === tab;
                return (
                  <Link
                    key={t.key}
                    href={t.key === 'inbox' ? '/coach/check-ins' : `/coach/check-ins?tab=${t.key}`}
                    aria-current={on ? 'page' : undefined}
                    className={clsx(
                      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-3.5 py-1.5 font-sans text-label-sm transition-colors',
                      on ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
                    )}
                  >
                    {t.label}
                    {t.key === 'inbox' ? <span className="tabular-nums">({inbox.unreviewed})</span> : null}
                  </Link>
                );
              })}
            </nav>
            {tab === 'builder' ? <TemplateEditor /> : null}
          </div>
        }
      />
      <div className="space-y-6">
        {tab === 'inbox' ? <Inbox inbox={inbox} filter={parseInboxFilter(firstParam(params.filter))} selectedId={firstParam(params.r) ?? null} unit={user.weightUnit} /> : null}
        {tab === 'builder' ? <Builder inbox={inbox} /> : null}
        {tab === 'photos' ? <Photos clients={inbox.clients} clientId={firstParam(params.client) ?? null} unit={user.weightUnit} /> : null}
      </div>
    </>
  );
}

function Inbox({ inbox, filter, selectedId, unit }: { inbox: CheckInInboxDto; filter: InboxFilter; selectedId: string | null; unit: WeightUnit }) {
  const shown = filterInbox(inbox.responses, filter);
  const selected = inbox.responses.find((r) => r.id === selectedId) ?? shown[0] ?? null;
  const href = (patch: { filter?: InboxFilter; r?: string }): string => {
    const q = new URLSearchParams();
    const f = patch.filter ?? filter;
    if (f !== 'unreviewed') q.set('filter', f);
    if (patch.r) q.set('r', patch.r);
    const s = q.toString();
    return s ? `/coach/check-ins?${s}` : '/coach/check-ins';
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <section aria-label="Submitted check-ins" className="space-y-3 lg:col-span-4">
        <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-1" role="group" aria-label="Filter">
          {(['unreviewed', 'all'] as const).map((f) => (
            <Link
              key={f}
              href={href({ filter: f })}
              aria-current={f === filter ? 'page' : undefined}
              className={clsx(
                'inline-flex items-center rounded-full px-3.5 py-1 font-sans text-label-sm transition-colors',
                f === filter ? 'bg-raised text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {f === 'unreviewed' ? `To Review (${inbox.unreviewed})` : 'All'}
            </Link>
          ))}
        </div>
        {shown.length === 0 ? (
          <EmptyState title={filter === 'unreviewed' ? 'Inbox zero' : 'No check-ins yet'}>
            {inbox.templates.length === 0 ? 'Build a questionnaire and assign it to a client to start.' : 'New submissions land here.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-card">
            {shown.map((r) => {
              const active = r.id === selected?.id;
              return (
                <li key={r.id}>
                  <Link
                    href={href({ r: r.id })}
                    aria-current={active ? 'true' : undefined}
                    className={clsx('flex items-center justify-between gap-3 p-4 transition-colors', active ? 'bg-raised' : 'hover:bg-raised/70')}
                  >
                    <div className="min-w-0">
                      <p className={clsx('truncate font-sans text-label-md', active ? 'text-primary' : 'text-ink')}>
                        {r.clientName}
                      </p>
                      <p className="truncate font-sans text-label-sm font-normal text-muted">
                        {r.templateTitle}
                        {r.reviewedAt ? '' : ' · To review'}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-label-sm text-muted">{timeAgo(r.submittedAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selected ? (
        <article aria-labelledby="ci-detail" className="flex flex-col gap-5 rounded-md border border-line bg-card p-6 lg:col-span-8">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 id="ci-detail" className="font-display text-title-lg text-ink">
                {selected.clientName} — {selected.templateTitle}
              </h2>
              <p className="mt-0.5 font-mono text-label-sm text-muted">
                Period {day(selected.periodDate)} · Submitted {formatDate(selected.submittedAt)}
                {selected.bodyweightKg ? ` · Weight ${formatWeight(selected.bodyweightKg, unit)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {selected.reviewedAt ? <Badge tone="emerald">Reviewed</Badge> : <Badge tone="signal">To Review</Badge>}
              <Link href={`/coach/messages?client=${encodeURIComponent(selected.clientId)}`} className="font-sans text-label-md text-primary hover:underline">
                Message
              </Link>
            </div>
          </header>
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {selected.answers.map((a) => (
              <div key={a.questionId} className="rounded-sm border border-line bg-canvas-low p-4">
                <dt className="font-sans text-label-sm uppercase tracking-wider text-muted">{a.prompt}</dt>
                <dd className="mt-1.5 whitespace-pre-wrap font-sans text-body-md text-ink">{answerText(a)}</dd>
              </div>
            ))}
          </dl>
          <ReviewPanel key={selected.id} id={selected.id} reviewed={selected.reviewedAt !== null} reply={selected.coachReply} />
        </article>
      ) : null}
    </div>
  );
}

function Builder({ inbox }: { inbox: CheckInInboxDto }) {
  const today = new Date().toISOString().slice(0, 10);
  if (inbox.templates.length === 0) {
    return <EmptyState title="No questionnaires yet" action={<TemplateEditor />}>Build a weekly or one-off check-in, then assign it to clients.</EmptyState>;
  }
  return (
    <ul className="grid gap-4 xl:grid-cols-2">
      {inbox.templates.map((t) => (
        <li key={t.id}>
          <Panel
            title={t.title}
            meta={`${t.questions.length} questions`}
            actions={
              <>
                <TemplateEditor template={t} />
                <AssignCheckIn templateId={t.id} title={t.title} clients={inbox.clients} today={today} />
              </>
            }
          >
            <div className="space-y-4 p-4">
              <ol className="space-y-2">
                {t.questions.map((q, i) => (
                  <li key={q.id} className="text-ui">
                    <span className="font-mono text-faint">{i + 1}.</span> {q.prompt}
                    <span className="block pl-5 text-meta text-muted">
                      {CHECK_IN_KIND_LABELS[q.kind]}
                      {q.unit ? ` (${q.unit})` : ''} · {q.required ? 'Required' : 'Optional'}
                    </span>
                  </li>
                ))}
              </ol>
              <div>
                <p className="font-mono text-micro uppercase text-muted">Assigned to</p>
                {t.schedules.length === 0 ? (
                  <p className="text-meta text-faint">Nobody yet.</p>
                ) : (
                  <ul className="mt-1 divide-y divide-line">
                    {t.schedules.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 py-1">
                        <span className="text-ui">
                          {s.clientName} <span className="text-meta text-muted">· {scheduleLabel(s, day)}</span>
                        </span>
                        <UnassignButton schedule={s} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex justify-end">
                <DeleteTemplateButton id={t.id} title={t.title} />
              </div>
            </div>
          </Panel>
        </li>
      ))}
    </ul>
  );
}

async function Photos({ clients, clientId, unit }: { clients: { id: string; name: string }[]; clientId: string | null; unit: WeightUnit }) {
  const selected = clients.find((c) => c.id === clientId) ?? null;
  const progress = selected ? await bodyApi.clientProgress(selected.id) : null;
  const today = new Date().toISOString().slice(0, 10);
  const summary = progress ? summarizeBodyweight(progress.entries, null, today) : null;
  const first = progress?.entries[0];

  return (
    <div className="space-y-6">
      {/* Plain GET form: works without JavaScript. */}
      <form className="flex flex-wrap items-end gap-3" action="/coach/check-ins">
        <input type="hidden" name="tab" value="photos" />
        <div className="min-w-56">
          <Label htmlFor="ph-client">Client</Label>
          <Select id="ph-client" name="client" defaultValue={selected?.id ?? ''}>
            <option value="" disabled>
              Choose a client
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <button type="submit" className="h-9 rounded border border-line-strong px-3 text-ui hover:border-faint">
          Show
        </button>
      </form>
      <p className="text-meta text-muted">Clients choose which photos to share. Private photos never appear here.</p>
      {progress && summary ? (
        <>
          <StatStrip
            label="Bodyweight"
            items={[
              { label: 'Latest', value: summary.latest ? formatWeight(summary.latest.kg, unit) : '—', note: summary.latest ? day(summary.latest.date) : undefined },
              { label: '7-day average', value: summary.rollingAvg7 === null ? '—' : formatWeight(summary.rollingAvg7, unit) },
              {
                label: '90-day change',
                value: summary.latest && first ? `${summary.latest.kg - Number(first.weightKg) > 0 ? '+' : ''}${formatWeight(summary.latest.kg - Number(first.weightKg), unit)}` : '—',
              },
            ]}
          />
          {progress.photos.length === 0 ? (
            <EmptyState title="No shared photos">{progress.clientName} has not shared any progress photos with you.</EmptyState>
          ) : (
            <Panel title={`${progress.clientName} — date comparison`}>
              <div className="p-4">
                <PhotoCompare photos={progress.photos} weightOn={Object.fromEntries(progress.entries.map((e) => [e.date, formatWeight(e.weightKg, unit)]))} />
              </div>
            </Panel>
          )}
        </>
      ) : clients.length === 0 ? (
        <EmptyState title="No active clients">Photos appear once a client shares them.</EmptyState>
      ) : null}
    </div>
  );
}
