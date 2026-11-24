import { Role, WeightUnit } from '@coaching/shared';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { setWeightUnit } from '@/actions/account';
import { logout } from '@/actions/auth';
import { LimitationsPanel } from '@/components/limitations/LimitationsPanel';
import { AthleteNotificationCard, EffortScaleSetting } from '@/components/profile/AthletePreferences';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { exercisesApi, limitationsApi, meApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'AT';
}

const WORKSPACE_LINKS = [
  { href: '/client/check-in', title: 'Weekly Check-in', meta: 'Submit metrics & notes' },
  { href: '/client/body', title: 'Bodyweight & Readiness', meta: '7-day avg & photos' },
  { href: '/client/videos', title: 'Set Videos & L/R', meta: 'Clips & form checks' },
  { href: '/client/calls', title: 'Calls & Booking', meta: 'Self-book coach slots' },
  { href: '/client/nutrition', title: 'Nutrition & Hydration', meta: 'Macros, water & meal plans' },
  { href: '/client/roadmap', title: 'Coaching Roadmap', meta: 'Event countdown & phases' },
  { href: '/client/resources', title: 'Coach Vault', meta: 'Shared PDFs & guides' },
  { href: '/client/templates', title: 'Templates & Gyms', meta: 'Folders & equipment mode' },
  { href: '/client/coach-ai', title: 'MUR AI Training Coach', meta: 'Ask about your training' },
  { href: '/client/generate', title: 'AI Workout Generator', meta: 'Injury-aware sessions' },
  { href: '/client/settings/connectors', title: 'AI Connectors', meta: 'Read-only app access' },
  { href: '/client/billing', title: 'Plan & Billing', meta: 'MUR Coaching Pro & offers' },
] as const;

export default async function ProfilePage() {
  const user = await requireUser(Role.CLIENT);
  const [today, limitations, exercises] = await Promise.all([meApi.today(), limitationsApi.list(user.id), exercisesApi.list()]);
  const day = new Date().toISOString().slice(0, 10);
  const displayName = user.displayName ?? user.name;
  const coachName = today.coachName;

  return (
    <>
      <PageHeader title="Athlete Settings" meta="Preferences & Coaching Link" />

      <div className="max-w-4xl space-y-6">
        {/* Card 1: Profile & Units (`mur_coaching_athlete_web_settings`) */}
        <section className="flex flex-col gap-5 rounded-md border border-line bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-4">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-primary bg-raised font-display text-title-md text-primary">
                {initials(displayName)}
              </span>
              <div>
                <h2 className="font-display text-title-md text-ink">Profile &amp; Units</h2>
                <p className="font-mono text-label-sm text-muted">
                  {displayName} · {user.email}
                </p>
              </div>
            </div>
            <Badge tone="signal">Active</Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Weight Unit Toggle */}
            <div className="flex items-center justify-between gap-4 rounded-sm border border-line bg-canvas-low p-4">
              <div>
                <p className="font-sans text-label-md font-semibold text-ink">Weight Unit</p>
                <p className="text-label-sm text-muted">Used across all logs &amp; targets</p>
              </div>
              <form action={setWeightUnit} className="inline-flex gap-1 rounded-full border border-line bg-card p-1" aria-label="Weight unit">
                {[WeightUnit.KG, WeightUnit.LB].map((unit) => {
                  const active = user.weightUnit === unit;
                  return (
                    <button
                      key={unit}
                      type="submit"
                      name="unit"
                      value={unit}
                      aria-pressed={active}
                      disabled={active}
                      className={clsx(
                        'rounded-full px-3.5 py-1 font-mono text-label-sm transition-colors',
                        active ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
                      )}
                    >
                      {unit === WeightUnit.KG ? 'kg' : 'lb'}
                    </button>
                  );
                })}
              </form>
            </div>

            {/* Default Effort Scale Toggle */}
            <EffortScaleSetting />
          </div>
        </section>

        {/* Card 2: Notifications & Check-in Reminders */}
        <AthleteNotificationCard coachName={coachName} />

        {/* Card 3: Connected Coach */}
        <section className="flex flex-col gap-4 rounded-md border border-line bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="font-display text-title-md text-ink">Connected Coach</h2>
              <p className="mt-0.5 text-label-md text-muted">
                {coachName
                  ? 'Your coach has read/write access to your program and progression targets.'
                  : 'You are training independently. Accept a coach invite anytime to connect.'}
              </p>
            </div>
            <Badge tone={coachName ? 'emerald' : 'slate'}>{coachName ? 'Connected' : 'Independent'}</Badge>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-line bg-canvas-low p-4">
            <div className="flex items-center gap-3.5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-raised font-display text-title-md text-primary">
                {coachName ? initials(coachName) : 'MC'}
              </span>
              <div>
                <p className="font-display text-title-md text-ink">{coachName ? `${coachName} · Head Coach` : 'No Active Coach'}</p>
                <p className="font-mono text-label-sm text-muted">
                  {coachName ? 'MUR Coaching · Progression & Program Sync Active' : 'Self-guided MUR Coaching Athlete'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/client/billing" className={buttonClass('secondary', undefined, 'sm')}>
                Plan &amp; Billing
              </Link>
              {coachName ? (
                <Link href="/client/messages" className={buttonClass('primary', undefined, 'sm')}>
                  Message Coach
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2 lg:grid-cols-4">
            {WORKSPACE_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between gap-2 rounded-sm border border-line bg-canvas-low px-3.5 py-2.5 transition-colors hover:border-primary/40 hover:bg-raised"
              >
                <div className="min-w-0">
                  <p className="truncate font-sans text-label-md font-semibold text-ink group-hover:text-primary">{item.title}</p>
                  <p className="truncate text-label-sm text-muted">{item.meta}</p>
                </div>
                <Icon icon={ArrowUpRight} size={14} className="shrink-0 text-muted group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>

        {/* Card 4: Injuries & Limitations */}
        <LimitationsPanel
          clientId={user.id}
          limitations={limitations}
          exercises={exercises.map((e) => ({ id: e.id, name: e.name }))}
          today={day}
          large
        />

        {/* Sign Out */}
        <div className="flex justify-end pt-2">
          <form action={logout} className="w-full sm:w-56">
            <SubmitButton variant="secondary" size="lg" className="w-full" pendingLabel="Signing out…">
              Sign Out
            </SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
