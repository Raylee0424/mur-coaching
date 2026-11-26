import type { ModerationReportDto } from '@coaching/shared';
import { timeAgo } from '@/components/check-ins/check-ins-model';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/format';
import { initials } from '@/lib/initials';
import { ReportStatusButton } from './ReportStatusButton';
import { TARGET_LABELS, previewText, reasonLabel, repeatBadge } from './moderation-model';

export function ReportCard({ report }: { report: ModerationReportDto }) {
  const preview = previewText(report);
  const repeat = repeatBadge(report.openReportsOnTarget);
  const caption = report.preview?.type === 'SHARED_WORKOUT' ? report.preview.caption : null;
  return (
    <li>
      <Card className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:p-5">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="amber">{reasonLabel(report.reason)}</Badge>
            <Badge tone="slate">{TARGET_LABELS[report.targetType]}</Badge>
            {repeat ? <Badge tone="red">{repeat}</Badge> : null}
          </div>
          <div className="min-w-0">
            <p className={preview.gone ? 'break-words font-sans text-label-lg italic text-muted' : 'break-words font-sans text-label-lg text-ink'}>{preview.title}</p>
            {preview.detail ? <p className="break-words text-meta text-muted">{preview.detail}</p> : null}
            {caption ? <p className="break-words text-meta text-muted">“{caption}”</p> : null}
          </div>
          {report.details ? (
            <p className="whitespace-pre-line break-words text-body-md text-ink">{report.details}</p>
          ) : (
            <p className="break-words text-body-md text-muted">No details given.</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-meta text-muted">
            <span aria-hidden className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-raised font-sans text-label-sm text-ink">
              {initials(report.reporter.name)}
            </span>
            <span className="min-w-0 break-words">Reported by {report.reporter.name}</span>
            <span aria-hidden>·</span>
            <time dateTime={report.createdAt} title={formatDate(report.createdAt)}>
              {timeAgo(report.createdAt)}
            </time>
          </div>
        </div>
        <div className="flex md:justify-end">
          <ReportStatusButton id={report.id} status={report.status} targetLabel={preview.title} />
        </div>
      </Card>
    </li>
  );
}
