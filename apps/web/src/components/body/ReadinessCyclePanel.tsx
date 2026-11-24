'use client';

import clsx from 'clsx';
import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

const READINESS_KEY = 'mur:daily-readiness';
const CYCLE_KEY = 'mur:cycle-context';

interface ReadinessState {
  sleep: number;
  soreness: number;
  stress: number;
}

type CyclePhase = 'FOLLICULAR' | 'OVULATORY' | 'LUTEAL' | 'MENSTRUAL';

interface CycleState {
  phase: CyclePhase;
  notes: string;
}

const PHASE_META: Record<CyclePhase, { label: string; badge: string }> = {
  FOLLICULAR: { label: 'Follicular Phase', badge: 'Rising Recovery' },
  OVULATORY: { label: 'Ovulatory Window', badge: 'High Force Output' },
  LUTEAL: { label: 'Luteal Phase', badge: 'Steady Effort Cap' },
  MENSTRUAL: { label: 'Early Follicular / Menstrual', badge: 'Auto-Regulate RIR' },
};

export function ReadinessCyclePanel() {
  const toast = useToast();
  const [readiness, setReadiness] = useState<ReadinessState>({ sleep: 4, soreness: 2, stress: 2 });
  const [cycle, setCycle] = useState<CycleState>({ phase: 'OVULATORY', notes: '' });
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    try {
      const r = window.localStorage.getItem(READINESS_KEY);
      if (r) {
        const parsed = JSON.parse(r) as Partial<ReadinessState>;
        setReadiness((prev) => ({
          sleep: typeof parsed.sleep === 'number' ? parsed.sleep : prev.sleep,
          soreness: typeof parsed.soreness === 'number' ? parsed.soreness : prev.soreness,
          stress: typeof parsed.stress === 'number' ? parsed.stress : prev.stress,
        }));
      }
      const c = window.localStorage.getItem(CYCLE_KEY);
      if (c) {
        const parsed = JSON.parse(c) as Partial<CycleState>;
        if (parsed.phase && parsed.phase in PHASE_META) {
          setCycle({ phase: parsed.phase, notes: typeof parsed.notes === 'string' ? parsed.notes : '' });
        }
      }
    } catch {
      // Ignore malformed browser storage.
    }
  }, []);

  // Sleep higher is better (1..5), soreness & stress lower is better (1..5).
  const score = Math.round(((readiness.sleep + (6 - readiness.soreness) + (6 - readiness.stress)) / 15) * 100);

  function saveReadiness() {
    window.localStorage.setItem(READINESS_KEY, JSON.stringify(readiness));
    toast.show({ message: `Readiness saved (${score}/100)`, tone: 'ok' });
  }

  function saveCycle(next: CycleState) {
    setCycle(next);
    window.localStorage.setItem(CYCLE_KEY, JSON.stringify(next));
  }

  return (
    <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
      {/* Left: Pre-Workout Readiness Survey */}
      <div className="flex h-full flex-col justify-between gap-5 rounded-md border border-line bg-card p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-mono text-label-sm uppercase text-primary">PRE-WORKOUT SURVEY</span>
              <h2 className="font-display text-title-md text-ink">Daily Readiness Check</h2>
            </div>
            <span
              className={clsx(
                'rounded-full border px-3 py-1 font-mono text-label-sm',
                score >= 75 ? 'border-emerald/40 bg-emerald-bg text-emerald' : 'border-amber/40 bg-amber-bg text-amber',
              )}
            >
              Score: {score} / 100
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { key: 'sleep' as const, label: 'Sleep Quality', hint: '5 = Restorative' },
              { key: 'soreness' as const, label: 'Muscle Soreness', hint: '1 = Fresh' },
              { key: 'stress' as const, label: 'Mental Stress', hint: '1 = Low' },
            ].map((row) => (
              <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low px-4 py-3">
                <div>
                  <span className="block font-sans text-label-md font-semibold text-ink">{row.label}</span>
                  <span className="text-label-sm text-muted">{row.hint}</span>
                </div>
                <div className="inline-flex gap-1" role="group" aria-label={row.label}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = readiness[row.key] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setReadiness((prev) => ({ ...prev, [row.key]: n }))}
                        className={clsx(
                          'size-8 rounded-full border font-mono text-label-sm transition-colors',
                          active ? 'border-primary bg-primary text-primary-ink' : 'border-line bg-card text-muted hover:text-ink',
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={saveReadiness}>
          Save Today&apos;s Readiness
        </Button>
      </div>

      {/* Right: Privacy-Locked Menstrual Cycle Training-Context Log */}
      <div className="flex h-full flex-col justify-between gap-5 rounded-md border border-line bg-card p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon icon={Lock} size={16} className="text-primary" />
              <h2 className="font-display text-title-md text-ink">Cycle Training Context</h2>
            </div>
            <span className="rounded-full border border-line bg-raised px-2.5 py-0.5 font-mono text-label-sm text-muted">
              Private · Local Only
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low p-4">
            <div>
              <span className="font-mono text-label-sm uppercase text-sky">CURRENT PHASE</span>
              <p className="mt-0.5 font-display text-title-md text-ink">{PHASE_META[cycle.phase].label}</p>
            </div>
            <span className="rounded-full border border-emerald/40 bg-emerald-bg px-2.5 py-0.5 font-mono text-label-sm text-emerald">
              {PHASE_META[cycle.phase].badge}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cycle phase">
            {(Object.keys(PHASE_META) as CyclePhase[]).map((p) => {
              const active = cycle.phase === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    saveCycle({ ...cycle, phase: p });
                    toast.show({ message: `Cycle context set to ${PHASE_META[p].label}`, tone: 'ok' });
                  }}
                  className={clsx(
                    'rounded-full border px-3 py-1 font-sans text-label-sm transition-colors',
                    active ? 'border-primary bg-primary-container text-primary' : 'border-line bg-canvas-low text-muted hover:text-ink',
                  )}
                >
                  {PHASE_META[p].label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low p-4">
            <div>
              <p className="font-sans text-label-md font-semibold text-ink">Share phase context with coach</p>
              <p className="text-label-sm text-muted">Off by default. Stored locally in your browser.</p>
            </div>
            <span className="rounded-full border border-line bg-raised px-3 py-1 font-mono text-label-sm text-muted">OFF</span>
          </div>

          {editingNotes ? (
            <textarea
              rows={2}
              value={cycle.notes}
              onChange={(e) => saveCycle({ ...cycle, notes: e.target.value })}
              placeholder="Private symptoms or energy notes (stays in browser storage)..."
              className="w-full rounded-sm border border-line bg-canvas-low px-3.5 py-2 text-body-md text-ink placeholder:text-faint focus:border-primary focus:outline-none"
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setEditingNotes((v) => !v)}
          className="w-full rounded-full border border-line bg-canvas-low py-2.5 font-sans text-label-md font-semibold text-ink transition-colors hover:border-primary"
        >
          {editingNotes ? 'Done Editing Private Notes' : 'Log Cycle Symptoms & Notes'}
        </button>
      </div>
    </section>
  );
}
