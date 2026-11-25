'use client';

import clsx from 'clsx';
import { Mic, MicOff, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { AI_LIMITS } from '@coaching/shared';
import type { VoiceIntent } from '@coaching/shared';
import { parseVoiceCommand } from '@/actions/ai';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { canCommit, intentChips } from './voice-model';

/** Minimal Web Speech API surface (Chrome/Safari ship it prefixed; not in the TS DOM lib). */
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;

function speechCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Props {
  unit: string;
  hasExercise: boolean;
  /** Commits a confirmed intent; returns an error to show, or null on success. */
  onConfirm: (intent: VoiceIntent) => string | null;
  /** Label of the last voice action that can still be undone. */
  undoLabel: string | null;
  onUndo: () => void;
}

/**
 * Hands-free command HUD. Speech-to-text runs in the browser: no audio is uploaded or stored, only the transcript is
 * parsed. Nothing is logged until the athlete presses Confirm, and the last voice action can be undone.
 */
export function VoiceHud({ unit, hasExercise, onConfirm, undoLabel, onUndo }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [intent, setIntent] = useState<VoiceIntent | null>(null);
  const [source, setSource] = useState<'MODEL' | 'RULES' | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const rec = useRef<Recognition | null>(null);
  const heard = useRef('');

  useEffect(() => {
    setSupported(speechCtor() !== null);
    return () => rec.current?.stop();
  }, []);

  function parse(text: string) {
    const t = text.trim().slice(0, AI_LIMITS.maxTranscript);
    if (!t) return;
    setError(undefined);
    startTransition(async () => {
      const res = await parseVoiceCommand(t);
      if (!res.ok) return setError(res.error);
      setIntent(res.data.intent);
      setSource(res.data.source);
    });
  }

  function toggleListening() {
    if (listening) return rec.current?.stop();
    const Ctor = speechCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = navigator.language || 'en-US';
    r.interimResults = true;
    r.continuous = false;
    heard.current = '';
    r.onresult = (e) => {
      heard.current = Array.from(e.results, (res) => res[0]?.transcript ?? '').join(' ');
      setTranscript(heard.current);
    };
    r.onerror = (e) => setError(e.error === 'not-allowed' ? 'Microphone access was blocked. Type the command instead.' : 'Could not hear that. Try again or type it.');
    r.onend = () => {
      setListening(false);
      if (heard.current) parse(heard.current);
    };
    rec.current = r;
    setIntent(null);
    setListening(true);
    r.start();
  }

  function confirm() {
    if (!intent) return;
    const problem = onConfirm(intent);
    if (problem) return setError(problem);
    setIntent(null);
    setTranscript('');
  }

  return (
    <section aria-label="Voice logging" className="flex flex-col gap-3 rounded-md border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant={listening ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={listening}
            disabled={!supported || pending}
            onClick={toggleListening}
            className="w-10 px-0"
            aria-label={listening ? 'Stop listening' : 'Push to talk'}
          >
            <Icon icon={supported ? Mic : MicOff} size={20} />
          </Button>
          <div>
            <h2 className="font-display text-title-md text-ink">Hands-Free Voice Command HUD</h2>
            <p className="font-mono text-label-sm text-muted">
              {listening ? 'LISTENING…' : supported ? 'Push to talk. Audio stays in your browser.' : 'Voice input is not available in this browser. Type the command.'}
            </p>
          </div>
        </div>
        {undoLabel ? (
          <Button variant="ghost" size="sm" onClick={onUndo}>
            <Icon icon={Undo2} size={14} />
            Undo {undoLabel}
          </Button>
        ) : null}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          parse(transcript);
        }}
      >
        <Label htmlFor="voice-transcript" className="sr-only">
          Voice command transcript
        </Label>
        <Input
          id="voice-transcript"
          value={transcript}
          maxLength={AI_LIMITS.maxTranscript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Log 157.5 kilos for 5 reps at RPE 8, note crisp depth, start 3 minute rest"
        />
        <Button type="submit" variant="secondary" disabled={pending || !transcript.trim()} aria-busy={pending}>
          Parse
        </Button>
      </form>

      {intent ? (
        <div className="flex flex-col gap-3 rounded-sm border border-line bg-canvas-low p-3.5" aria-live="polite">
          <ul className="flex flex-wrap gap-2" aria-label="Parsed command">
            {intentChips(intent, unit).map((chip) => (
              <li key={chip}>
                <span className={clsx('inline-flex rounded-full border px-3 py-1 font-mono text-label-sm', intent.type === 'UNKNOWN' ? 'border-line text-muted' : 'border-primary/40 bg-primary-container text-primary')}>
                  {chip}
                </span>
              </li>
            ))}
            <li>
              <Badge tone={source === 'MODEL' ? 'signal' : 'slate'}>{source === 'MODEL' ? 'AI parse' : 'Rules parse'}</Badge>
            </li>
          </ul>
          {intent.type === 'SWAP' ? <p className="text-meta text-muted">Use the Swap button to pick it: the swap list shows your limitation flags.</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={confirm} disabled={!canCommit(intent, hasExercise)}>
              {intent.type === 'LOG_SET' ? 'Commit Set to Log' : intent.type === 'REST_TIMER' ? 'Start Rest Timer' : 'Confirm'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIntent(null)}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}
      <FormError>{error}</FormError>
    </section>
  );
}
