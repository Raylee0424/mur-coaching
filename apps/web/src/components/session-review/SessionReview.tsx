import type { SessionReviewDto, WeightUnit } from '@coaching/shared';
import { Panel } from '@/components/ui/Card';
import { StatStrip, type StatItem } from '@/components/ui/StatStrip';
import { formatRpe } from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { FeedbackThread } from './FeedbackThread';
import { groupFeedback, liftSummary } from './session-review-model';

/** Coach review of one logged session: totals, each lift with its sets, and comments at three scopes. */
export function SessionReview({ review, unit }: { review: SessionReviewDto; unit: WeightUnit }) {
  const grouped = groupFeedback(review.feedback);
  const { clientId, logId } = review;
  const stats: StatItem[] = [
    { label: 'Volume', value: review.workingSets === 0 ? '—' : formatWeight(review.volumeKg, unit) },
    { label: 'Avg RPE', value: review.avgRpe === null ? '—' : review.avgRpe.toFixed(1) },
    { label: 'Working sets', value: String(review.workingSets) },
    { label: 'Lifts', value: String(review.exercises.length) },
  ];

  return (
    <div className="space-y-6">
      <StatStrip label="Session totals" items={stats} />
      {review.clientNotes ? (
        <p className="border-l-2 border-l-line-strong px-3 py-1 text-ui text-muted">
          <span className="font-mono text-micro uppercase text-faint">{review.clientName} wrote</span>
          <span className="mt-0.5 block text-ink">{review.clientNotes}</span>
        </p>
      ) : null}

      <Panel title="Session feedback" meta="Overall comments">
        <div className="p-4">
          <FeedbackThread
            clientId={clientId}
            logId={logId}
            items={grouped.session}
            scope={{}}
            id="session"
            label="Comment on the whole session"
            carryLabel="Show on their next session"
          />
        </div>
      </Panel>

      {review.exercises.map((ex) => {
        const summary = liftSummary(ex.sets, unit);
        return (
          <Panel key={ex.id} title={ex.name} meta={`${ex.sets.length} ${ex.sets.length === 1 ? 'set' : 'sets'} logged`}>
            <div className="space-y-4 p-4">
              {ex.swappedFromName ? <p className="text-meta text-amber">Swapped from {ex.swappedFromName}</p> : null}
              {summary ? <p className="font-mono text-ui">{summary}</p> : null}
              {ex.notes ? <p className="text-meta text-muted">Client note: {ex.notes}</p> : null}

              <div role="table" aria-label={`${ex.name} sets`} className="overflow-x-auto">
                <div className="min-w-[28rem] divide-y divide-line">
                  <div role="row" className="grid grid-cols-[3rem_1fr_5rem] gap-3 pb-1.5 font-mono text-micro uppercase text-muted">
                    <span role="columnheader">Set</span>
                    <span role="columnheader">Load × reps</span>
                    <span role="columnheader">RPE</span>
                  </div>
                  {ex.sets.map((s) => (
                    <div key={s.id} role="row" className="space-y-2 py-2">
                      <div className="grid grid-cols-[3rem_1fr_5rem] items-center gap-3 font-mono text-ui">
                        <span role="cell">{s.isWarmup ? 'W' : s.setNumber}</span>
                        <span role="cell">
                          {formatWeight(s.weightKg, unit)} × {s.reps}
                        </span>
                        <span role="cell" className="text-muted">
                          {s.rpe === null ? '—' : formatRpe(s.rpe).replace('RPE ', '')}
                        </span>
                      </div>
                      <div className="pl-[3.75rem]">
                        <FeedbackThread
                          compact
                          clientId={clientId}
                          logId={logId}
                          items={grouped.set.get(s.id) ?? []}
                          scope={{ exerciseLogId: ex.id, setLogId: s.id }}
                          id={`set-${s.id}`}
                          label={`Comment on set ${s.setNumber}`}
                          carryLabel={`Carry to next ${ex.name} session`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-line pt-4">
                <FeedbackThread
                  clientId={clientId}
                  logId={logId}
                  items={grouped.exercise.get(ex.id) ?? []}
                  scope={{ exerciseLogId: ex.id }}
                  id={`ex-${ex.id}`}
                  label={`Feedback on ${ex.name}`}
                  carryLabel={`Pin to their next ${ex.name} session`}
                />
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
