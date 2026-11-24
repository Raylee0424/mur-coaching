import Link from 'next/link';
import { Role, WEEKDAY_LABELS, formatMinute } from '@coaching/shared';
import { AvailabilityEditor } from '@/components/calls/AvailabilityEditor';
import { CoachSchedule } from '@/components/calls/CoachSchedule';
import { zoneLabel } from '@/components/calls/calls-model';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { callsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function SchedulePage() {
  await requireUser(Role.COACH);
  const schedule = await callsApi.schedule();
  const tz = schedule.availability?.timezone ?? 'UTC';
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const today = schedule.upcoming.filter((b) => new Date(b.startsAt).toLocaleDateString('en-CA', { timeZone: tz }) === todayKey).length;

  return (
    <>
      <PageHeader
        title="Calls, Scheduling & Automations"
        meta={`${schedule.availability ? `${tz} (${zoneLabel(tz)})` : 'No timezone set'} · ${today} Call${today === 1 ? '' : 's'} Today`}
        actions={
          <>
            <AvailabilityEditor availability={schedule.availability} />
            <Link href="/coach/automations" className={buttonClass('primary', undefined, 'sm')}>
              Rule-Based Automations
            </Link>
          </>
        }
      />
      <div className="space-y-6">
        {!schedule.availability ? (
          <EmptyState title="Set your bookable hours">Add weekly windows and your timezone. Clients then pick open slots from their Calls page.</EmptyState>
        ) : (
          <p className="font-mono text-label-sm text-muted">
            Bookable:{' '}
            {schedule.availability.windows.length
              ? schedule.availability.windows.map((w) => `${WEEKDAY_LABELS[w.weekday]?.slice(0, 3)} ${formatMinute(w.startMinute)}–${formatMinute(w.endMinute)}`).join(' · ')
              : 'no windows'}
          </p>
        )}
        <CoachSchedule schedule={schedule} timeZone={tz} />
      </div>
    </>
  );
}
