import { Role, VIDEO_SIDE_LABELS } from '@coaching/shared';
import type { SetVideoDto } from '@coaching/shared';
import { LRCompare } from '@/components/videos/LRCompare';
import { ReviewPlayer } from '@/components/videos/ReviewPlayer';
import { VideoActions } from '@/components/videos/VideoActions';
import { VideoUpload } from '@/components/videos/VideoUpload';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { videosApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate, formatRpe } from '@/lib/format';
import { formatWeight } from '@/lib/units';

export default async function SetVideosPage() {
  const user = await requireUser(Role.CLIENT);
  const data = await videosApi.mine();
  const weight = (kg: string) => formatWeight(kg, user.weightUnit);
  const title = (v: SetVideoDto) => `${v.exerciseName} set ${v.setNumber}`;
  const reviewed = data.videos.filter((v) => v.review?.status === 'REVIEWED');

  return (
    <>
      <PageHeader
        title="Set Videos & L/R Unilateral Comparison"
        back={{ href: '/client/profile', label: 'Settings' }}
        meta={`${data.videos.length} clips`}
        actions={<VideoUpload sets={data.recentSets} weight={weight} disabledReason={data.storageConfigured ? null : 'Video storage is not configured on this server.'} />}
      />

      <div className="space-y-8">
        {!data.storageConfigured ? (
          <p role="status" className="rounded-md border border-amber/40 bg-amber-bg px-4 py-3 text-ui text-amber">
            Video storage is not configured on this server, so clips are off.
          </p>
        ) : data.videos.length === 0 ? (
          <EmptyState title="No clips yet">Film a set from the side at hip height, then upload it against the set you logged.</EmptyState>
        ) : (
          <>
            <LRCompare videos={data.videos} />

            {reviewed.length ? (
              <section aria-labelledby="reviews-heading" className="space-y-4">
                <h2 id="reviews-heading" className="font-display text-title-lg text-ink">
                  Coach Telestrator Reviews
                </h2>
                {reviewed.map((v) => (
                  <Panel key={v.id} title={title(v)} meta={v.review?.reviewedAt ? `Reviewed ${formatDate(v.review.reviewedAt)}` : undefined}>
                    <div className="p-4">
                      <ReviewPlayer url={v.url} review={v.review!} label={`${title(v)} with coach drawings`} />
                    </div>
                  </Panel>
                ))}
              </section>
            ) : null}

            {/* Web Video Gallery Linked to Logged Sets (`athlete_web_set_videos_l_r_comparison`) */}
            <section aria-labelledby="gallery-heading" className="space-y-3">
              <h2 id="gallery-heading" className="font-display text-title-lg text-ink">
                Logged Set Video Gallery
              </h2>
              <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {data.videos.map((v) => (
                  <li key={v.id} className="flex flex-col overflow-hidden rounded-md border border-line bg-card">
                    <video src={v.url} preload="metadata" muted playsInline className="h-44 w-full bg-black object-cover" aria-hidden="true" />
                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-label-sm uppercase text-primary">
                            {formatDate(v.performedAt)} · SET {v.setNumber} · {VIDEO_SIDE_LABELS[v.side]}
                          </span>
                          {v.review ? (
                            <Badge tone={v.review.status === 'REVIEWED' ? 'emerald' : 'amber'}>
                              {v.review.status === 'REVIEWED' ? 'Reviewed' : 'Pending Review'}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate font-display text-title-md text-ink">{v.exerciseName}</p>
                        <p className="font-mono text-label-sm text-muted">
                          {weight(v.weightKg)} × {v.reps}
                          {v.rpe ? ` @ ${formatRpe(v.rpe)}` : v.rir !== null ? ` @ RIR ${v.rir}` : ''}
                        </p>
                      </div>
                      <div className="flex justify-end border-t border-line pt-2.5">
                        <VideoActions id={v.id} label={title(v)} canRequest={data.hasCoach && !v.review} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </>
  );
}
