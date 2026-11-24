'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

export const EFFORT_MODE_STORAGE_KEY = 'mur:effort-mode';
const NOTIFICATIONS_STORAGE_KEY = 'mur:athlete-notifications';

export type StoredEffortMode = 'RPE' | 'RIR';

interface NotificationPrefs {
  coachReviewAlerts: boolean;
  sundayCheckInReminder: boolean;
  restTimerAlerts: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  coachReviewAlerts: true,
  sundayCheckInReminder: true,
  restTimerAlerts: true,
};

/** Default Effort Scale pill toggle persisted in localStorage and read by WorkoutLogger. */
export function EffortScaleSetting() {
  const toast = useToast();
  const [effort, setEffort] = useState<StoredEffortMode>('RPE');

  useEffect(() => {
    const raw = window.localStorage.getItem(EFFORT_MODE_STORAGE_KEY);
    if (raw === 'RPE' || raw === 'RIR') setEffort(raw);
  }, []);

  function select(next: StoredEffortMode) {
    setEffort(next);
    window.localStorage.setItem(EFFORT_MODE_STORAGE_KEY, next);
    toast.show({ message: `Default effort scale set to ${next}`, tone: 'ok' });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-sm border border-line bg-canvas-low p-4">
      <div>
        <p className="font-sans text-label-md font-semibold text-ink">Default Effort Scale</p>
        <p className="text-label-sm text-muted">Displayed in Active Workout</p>
      </div>
      <div className="inline-flex gap-1 rounded-full border border-line bg-card p-1" role="group" aria-label="Default Effort Scale">
        {(['RPE', 'RIR'] as const).map((scale) => {
          const active = effort === scale;
          return (
            <button
              key={scale}
              type="button"
              aria-pressed={active}
              onClick={() => select(scale)}
              className={clsx(
                'rounded-full px-3.5 py-1 font-mono text-label-sm transition-colors',
                active ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
              )}
            >
              {scale}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Stitch Notifications & Check-in Reminders card persisted locally. */
export function AthleteNotificationCard({ coachName }: { coachName: string | null }) {
  const toast = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
      setPrefs((prev) => ({
        coachReviewAlerts: typeof parsed.coachReviewAlerts === 'boolean' ? parsed.coachReviewAlerts : prev.coachReviewAlerts,
        sundayCheckInReminder: typeof parsed.sundayCheckInReminder === 'boolean' ? parsed.sundayCheckInReminder : prev.sundayCheckInReminder,
        restTimerAlerts: typeof parsed.restTimerAlerts === 'boolean' ? parsed.restTimerAlerts : prev.restTimerAlerts,
      }));
    } catch {
      // Ignore malformed localStorage data.
    }
  }, []);

  function toggle(key: keyof NotificationPrefs, label: string) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
      toast.show({ message: `${label} ${next[key] ? 'enabled' : 'muted'}`, tone: 'ok' });
      return next;
    });
  }

  const items: Array<{ key: keyof NotificationPrefs; title: string; description: string }> = [
    {
      key: 'coachReviewAlerts',
      title: 'Coach Review Alerts',
      description: `Notify immediately when ${coachName ?? 'your coach'} comments on a set video or progression call.`,
    },
    {
      key: 'sundayCheckInReminder',
      title: 'Sunday Check-in Reminder',
      description: 'Send weekly reminder at 09:00 AM for weight average and progress photos.',
    },
    {
      key: 'restTimerAlerts',
      title: 'Rest Timer Sound & Vibration',
      description: 'Play audio chime and haptic cue when rest countdown reaches 0:00.',
    },
  ];

  return (
    <section className="flex flex-col gap-4 rounded-md border border-line bg-card p-6">
      <div className="border-b border-line pb-3">
        <h2 className="font-display text-title-md text-ink">Notifications &amp; Check-in Reminders</h2>
        <p className="mt-0.5 text-label-md text-muted">Control alerts for coach feedback, weekly check-ins, and rest timers.</p>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const active = prefs[item.key];
          return (
            <div key={item.key} className="flex items-center justify-between gap-4 rounded-sm border border-line bg-canvas-low px-4 py-3.5">
              <div>
                <p className="font-sans text-label-md font-semibold text-ink">{item.title}</p>
                <p className="text-label-sm text-muted">{item.description}</p>
              </div>
              <button
                type="button"
                aria-label={item.title}
                aria-pressed={active}
                onClick={() => toggle(item.key, item.title)}
                className={clsx(
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                  active ? 'bg-primary' : 'border border-line bg-raised',
                )}
              >
                <span
                  className={clsx(
                    'inline-block size-4 rounded-full transition-transform',
                    active ? 'translate-x-6 bg-primary-ink' : 'translate-x-1 bg-muted',
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
