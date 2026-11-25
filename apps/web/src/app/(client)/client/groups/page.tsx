import clsx from 'clsx';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import type { GroupDetailDto, GroupLeaderboardDto, SharedWorkoutDto, SocialOverviewDto, WeightUnit } from '@coaching/shared';
import { ShareStatsToggle } from '@/components/health/HealthControls';
import { formatSteps } from '@/components/health/health-import';
import {
  CreateGroupButton,
  DeleteShareButton,
  FriendActions,
  InviteCodeBox,
  JoinByCodeForm,
  JoinPublicButton,
  LeaveGroupButton,
  MemberActions,
  ReportButton,
  ShareWorkoutForm,
} from '@/components/social/SocialControls';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { socialApi, templatesApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';
import { formatDate, formatRpe } from '@/lib/format';
import { kgToDisplay, unitLabel } from '@/lib/units';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ago = (iso: string): string => {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 60) return `${Math.max(1, min)}m ago`;
  if (min < 1440) return `${Math.round(min / 60)}h ago`;
  return formatDate(iso);
};

/** Social & training groups (`athlete_web_social_training_groups`). Private by default; stats and posts are opt-in. */
export default async function GroupsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const [overview, params] = await Promise.all([socialApi.overview(), searchParams]);
  const selectedId = firstParam(params.group);
  const selected = overview.groups.find((g) => g.id === selectedId) ?? overview.groups[0];
  const friends = overview.friends.filter((f) => f.status === 'ACCEPTED');

  const detail = selected
    ? await Promise.all([
        socialApi.group(selected.id),
        socialApi.feed(selected.id),
        socialApi.leaderboard(selected.id),
        workoutLogsApi.listForClient(user.id, { limit: 15 }),
        templatesApi.list(),
      ])
    : null;

  return (
    <>
      <PageHeader
        title="Social & Training Groups"
        back={{ href: '/client/profile', label: 'Back to profile' }}
        meta={`${overview.groups.length} Groups · ${friends.length} Friends`}
        actions={<CreateGroupButton />}
      />
      <div className="space-y-8">
        <section aria-labelledby="groups-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="groups-heading" className="font-display text-title-lg text-ink">
              Your Training Groups
            </h2>
            <JoinByCodeForm />
          </div>
          {overview.groups.length === 0 && overview.discover.length === 0 ? (
            <EmptyState title="No groups yet">Create a private group and share its invite code, or join one with a code from a friend.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {overview.groups.map((g) => (
                <article key={g.id} className={clsx('flex flex-col justify-between gap-3 rounded-md border bg-card p-5', g.id === selected?.id ? 'border-primary' : 'border-line')}>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={g.role === 'OWNER' ? 'signal' : 'slate'}>{g.role === 'OWNER' ? 'Owner' : 'Member'}</Badge>
                    <span className="font-mono text-label-sm text-muted">{`${g.memberCount} lifters`}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-title-md text-ink">{g.name}</h3>
                    {g.description ? <p className="mt-1 text-label-md text-muted">{g.description}</p> : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-label-sm text-muted">{g.isPrivate ? 'PRIVATE' : 'LISTED'} · {g.shareStats ? 'SHARING STATS' : 'STATS HIDDEN'}</span>
                    <Link href={`/client/groups?group=${encodeURIComponent(g.id)}`} aria-current={g.id === selected?.id ? 'true' : undefined} className={buttonClass('secondary', undefined, 'sm')}>
                      Open Feed
                    </Link>
                  </div>
                </article>
              ))}
              {overview.discover.map((g) => (
                <article key={g.id} className="flex flex-col justify-between gap-3 rounded-md border border-dashed border-line-strong bg-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="sky">Open Invite</Badge>
                    <span className="font-mono text-label-sm text-muted">{`${g.memberCount} lifters`}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-title-md text-ink">{g.name}</h3>
                    {g.description ? <p className="mt-1 text-label-md text-muted">{g.description}</p> : null}
                  </div>
                  <JoinPublicButton code={g.inviteCode} />
                </article>
              ))}
            </div>
          )}
        </section>

        {selected && detail ? (
          <GroupHub
            group={detail[0]}
            feed={detail[1]}
            board={detail[2]}
            sessions={detail[3].items.map((l) => ({ id: l.id, label: `${formatDate(l.performedAt)} · ${l.exerciseLogs.map((e) => e.exercise.name).slice(0, 2).join(', ') || 'Session'}` }))}
            templates={detail[4].map((t) => ({ id: t.id, label: t.name }))}
            friendIds={new Set(overview.friends.map((f) => f.userId))}
            unit={user.weightUnit}
          />
        ) : null}

        <FriendsPanel overview={overview} />
      </div>
    </>
  );
}

function GroupHub({
  group,
  feed,
  board,
  sessions,
  templates,
  friendIds,
  unit,
}: {
  group: GroupDetailDto;
  feed: SharedWorkoutDto[];
  board: GroupLeaderboardDto;
  sessions: { id: string; label: string }[];
  templates: { id: string; label: string }[];
  friendIds: Set<string>;
  unit: WeightUnit;
}) {
  const isOwner = group.role === 'OWNER';
  const weight = (kg: string): string => `${kgToDisplay(Number(kg), unit)} ${unitLabel(unit)}`;
  return (
    <section aria-labelledby="hub-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="hub-heading" className="font-display text-title-lg text-ink">
          {group.name}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <InviteCodeBox groupId={group.id} code={group.inviteCode} isOwner={isOwner} />
          <ReportButton targetType="GROUP" targetId={group.id} label="Report this group" />
          <LeaveGroupButton groupId={group.id} isOwner={isOwner} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <h3 className="font-display text-title-md text-ink">Shareable Workout Feed</h3>
          <ShareWorkoutForm groupId={group.id} sessions={sessions} templates={templates} />
          {feed.length === 0 ? (
            <p className="text-ui text-muted">Nothing shared yet. Posts are opt-in: only what a member chooses to share shows here.</p>
          ) : (
            <ul className="space-y-4">
              {feed.map((p) => (
                <li key={p.id} className="space-y-3 rounded-md border border-line bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-title-md text-ink">{p.author.isYou ? `${p.author.name} (You)` : p.author.name}</p>
                      <p className="font-mono text-label-sm text-muted">{`${ago(p.createdAt)} · ${group.name}`}</p>
                    </div>
                    {p.summary.prCount > 0 ? <Badge tone="signal">{`${p.summary.prCount} PR${p.summary.prCount === 1 ? '' : 's'}`}</Badge> : p.kind === 'TEMPLATE' ? <Badge tone="sky">Template</Badge> : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                    <span className="font-sans text-ui font-semibold text-ink">{p.summary.title}</span>
                    {p.summary.volumeKg ? <span className="font-mono text-label-sm text-muted">{weight(p.summary.volumeKg)}</span> : null}
                  </div>
                  {p.caption ? <p className="text-ui text-ink">{p.caption}</p> : null}
                  <ul className="space-y-1.5">
                    {p.summary.lifts.slice(0, 6).map((l) => (
                      <li key={l.exercise} className="flex items-center justify-between gap-2 font-mono text-label-md">
                        <span className="text-ink">{l.exercise}</span>
                        <span className="tabular-nums text-muted">
                          {p.kind === 'TEMPLATE' ? `${l.sets} × ${l.reps || '—'}` : `${weight(l.weightKg)} × ${l.reps}${l.rpe ? ` @ RPE ${formatRpe(l.rpe)}` : ''}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-end gap-1">
                    {!p.author.isYou ? <ReportButton targetType="SHARED_WORKOUT" targetId={p.id} label={`Report post by ${p.author.name}`} /> : null}
                    {p.canDelete ? <DeleteShareButton shareId={p.id} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section aria-labelledby="lb-heading" className="overflow-hidden rounded-md border border-line bg-card lg:col-span-4">
          <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
            <h3 id="lb-heading" className="font-display text-title-md text-ink">
              Group Leaderboard
            </h3>
            <Badge tone="signal">THIS WEEK</Badge>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas-low px-5 py-3">
            <p className="text-label-sm text-muted">{board.viewerSharing ? 'You share your 7-day steps, streak and new PRs here.' : 'Opt in to appear. Nothing is shared until you do.'}</p>
            <ShareStatsToggle groupId={group.id} sharing={board.viewerSharing} />
          </div>
          {board.rows.length === 0 ? (
            <p className="px-5 py-4 text-ui text-muted">No one shares stats yet.</p>
          ) : (
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={TH}>#</th>
                  <th scope="col" className={TH}>ATHLETE</th>
                  <th scope="col" className={TH_NUM}>7D STEPS</th>
                  <th scope="col" className={TH_NUM}>PRS</th>
                </tr>
              </thead>
              <tbody>
                {board.rows.map((r) => (
                  <tr key={r.userId} className={clsx(TR, r.isYou && 'bg-primary-container/30')}>
                    <td className={clsx(TD, 'font-mono', r.rank === 1 ? 'text-primary' : 'text-muted')}>{String(r.rank).padStart(2, '0')}</td>
                    <td className={clsx(TD, 'text-ink')}>{r.isYou ? `${r.name} (You)` : r.name}</td>
                    <td className={TD_NUM}>{formatSteps(r.avg7Steps)}</td>
                    <td className={TD_NUM}>{r.prs7d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="members-heading" className="rounded-md border border-line bg-card p-5 lg:col-span-3">
          <h3 id="members-heading" className="mb-3 font-display text-title-md text-ink">{`Members (${group.members.length})`}</h3>
          <ul className="space-y-2">
            {group.members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-ui text-ink">
                  {m.isYou ? `${m.name} (You)` : m.name}
                  {m.role === 'OWNER' ? <span className="ml-1 font-mono text-label-sm text-primary">OWNER</span> : null}
                </span>
                {!m.isYou ? <MemberActions groupId={group.id} userId={m.userId} name={m.name} canRemove={isOwner} friend={friendIds.has(m.userId)} /> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

function FriendsPanel({ overview }: { overview: SocialOverviewDto }) {
  if (overview.friends.length === 0 && overview.blocked.length === 0) return null;
  return (
    <section aria-labelledby="friends-heading" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-md border border-line bg-card p-5">
        <h2 id="friends-heading" className="mb-3 font-display text-title-md text-ink">
          Friends
        </h2>
        {overview.friends.length === 0 ? (
          <p className="text-ui text-muted">Add group-mates from a group&apos;s member list.</p>
        ) : (
          <ul className="space-y-2">
            {overview.friends.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2">
                <span className="text-ui text-ink">
                  {f.name} {f.status === 'PENDING' ? <Badge tone="amber">{f.outgoing ? 'Requested' : 'Wants to connect'}</Badge> : null}
                </span>
                <FriendActions id={f.id} userId={f.userId} name={f.name} pendingIncoming={f.status === 'PENDING' && !f.outgoing} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-md border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-title-md text-ink">Blocked</h2>
        {overview.blocked.length === 0 ? (
          <p className="text-ui text-muted">No one blocked.</p>
        ) : (
          <ul className="space-y-2">
            {overview.blocked.map((b) => (
              <li key={b.userId} className="flex items-center justify-between gap-2">
                <span className="text-ui text-ink">{b.name}</span>
                <FriendActions userId={b.userId} name={b.name} blocked />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
