'use client';

import { VIDEO_SIDE_LABELS } from '@coaching/shared';
import type { SetVideoDto } from '@coaching/shared';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';
import { defaultPair, FRAME_SECONDS, stepTime } from './videos-model';

/** Dual Synchronized Side-by-Side Left vs. Right Video Player (`athlete_web_set_videos_l_r_comparison`). */
export function LRCompare({ videos }: { videos: SetVideoDto[] }) {
  const [initialLeft, initialRight] = defaultPair(videos);
  const [leftId, setLeftId] = useState(initialLeft);
  const [rightId, setRightId] = useState(initialRight);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(6);
  const refs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)] as const;
  const players = () => refs.map((r) => r.current).filter((v): v is HTMLVideoElement => v !== null);

  const toggle = () => {
    const vs = players();
    if (playing) vs.forEach((v) => v.pause());
    else void Promise.all(vs.map((v) => v.play().catch(() => undefined)));
    setPlaying(!playing);
  };

  const step = (frames: number) => {
    const vs = players();
    vs.forEach((v) => {
      v.pause();
      v.currentTime = stepTime(v.currentTime, frames, v.duration);
    });
    setPlaying(false);
    setTime(vs[0]?.currentTime ?? 0);
  };

  const scrub = (nextSeconds: number) => {
    const vs = players();
    vs.forEach((v) => {
      v.pause();
      v.currentTime = Math.min(Number.isFinite(v.duration) ? v.duration : nextSeconds, Math.max(0, nextSeconds));
    });
    setPlaying(false);
    setTime(nextSeconds);
  };

  const label = (v: SetVideoDto) => `${formatDate(v.performedAt)} · ${v.exerciseName} · set ${v.setNumber} · ${VIDEO_SIDE_LABELS[v.side]}`;
  const leftClip = videos.find((x) => x.id === leftId);

  const pane = (id: string | null, set: (v: string) => void, idx: 0 | 1, title: string, accent: 'sky' | 'primary') => {
    const v = videos.find((x) => x.id === id);
    return (
      <div className="min-w-0 overflow-hidden rounded-sm border border-line bg-canvas-low">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-card px-4 py-2.5">
          <label htmlFor={`lr-${idx}`} className={clsx('font-mono text-label-md uppercase', accent === 'sky' ? 'text-sky' : 'text-primary')}>
            {title}
          </label>
          <div className="w-full sm:w-64">
            <Select id={`lr-${idx}`} value={id ?? ''} onChange={(e) => set(e.target.value)}>
              {videos.map((x) => (
                <option key={x.id} value={x.id}>
                  {label(x)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {v ? (
          <video
            ref={refs[idx]}
            key={v.id}
            src={v.url}
            playsInline
            muted
            preload="metadata"
            onLoadedMetadata={idx === 0 ? (e) => setDuration(Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0 ? e.currentTarget.duration : 6) : undefined}
            onTimeUpdate={idx === 0 ? (e) => setTime(e.currentTarget.currentTime) : undefined}
            onEnded={() => setPlaying(false)}
            className="aspect-[16/10] max-h-80 w-full bg-black object-contain"
            aria-label={label(v)}
          />
        ) : null}
      </div>
    );
  };

  if (videos.length < 2) {
    return (
      <section className="rounded-md border border-line bg-card p-6">
        <span className="font-mono text-label-sm uppercase text-primary">SYNCHRONIZED UNILATERAL COMPARISON</span>
        <p className="mt-1 text-ui text-muted">Upload at least two clips (e.g., Left vs. Right unilateral sets) to compare them frame-by-frame.</p>
      </section>
    );
  }

  const currentFrame = Math.round(time / FRAME_SECONDS);
  const totalFrames = Math.max(1, Math.round(duration / FRAME_SECONDS));

  return (
    <section className="flex flex-col gap-5 rounded-md border border-line bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-label-sm uppercase text-primary">SYNCHRONIZED UNILATERAL COMPARISON</span>
          <h2 className="mt-0.5 font-display text-title-lg text-ink">
            {leftClip ? `${leftClip.exerciseName} · Set ${leftClip.setNumber}` : 'Side-by-Side Frame Sync'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald-bg px-3 py-1 font-mono text-label-sm text-emerald">
            <span className="size-2 rounded-full bg-emerald" />
            Frame-Sync Locked
          </span>
          <span className="font-mono text-label-md text-primary tabular-nums" aria-live="off">
            FRAME {String(currentFrame).padStart(3, '0')} / {String(totalFrames).padStart(3, '0')}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {pane(leftId, setLeftId, 0, 'LEFT PANE (LEAD)', 'sky')}
        {pane(rightId, setRightId, 1, 'RIGHT PANE (LEAD)', 'primary')}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-line bg-canvas-low p-4" role="group" aria-label="Synced playback">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => step(-1)} aria-label="Back one frame">
            <Icon icon={ChevronLeft} />
            -1f
          </Button>
          <Button size="sm" onClick={toggle}>
            <Icon icon={playing ? Pause : Play} />
            {playing ? 'Pause' : 'Play Synced'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => step(1)} aria-label="Forward one frame">
            +1f
            <Icon icon={ChevronRight} />
          </Button>
        </div>

        <input
          type="range"
          min={0}
          max={duration}
          step={FRAME_SECONDS}
          value={Math.min(time, duration)}
          onChange={(e) => scrub(Number(e.target.value))}
          aria-label="Synchronized frame scrubber"
          className="min-w-48 flex-1 accent-primary"
        />

        <span className="font-mono text-label-sm text-muted tabular-nums">{time.toFixed(2)}s</span>
      </div>
    </section>
  );
}
