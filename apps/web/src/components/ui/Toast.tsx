'use client';

import clsx from 'clsx';
import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { pushToast, removeToast, type ToastInput, type ToastItem } from './toast-model';

interface ToastApi {
  show: (t: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_BORDER: Record<ToastItem['tone'], string> = {
  ok: 'border-emerald/40',
  error: 'border-danger/50',
  neutral: 'border-line-strong',
};

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => clearTimeout(t);
  }, [paused, toast.id, toast.durationMs, onDismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={clsx(
        'pointer-events-auto flex items-center gap-3 rounded-md border bg-raised px-4 py-3 text-ui text-ink',
        TONE_BORDER[toast.tone],
      )}
    >
      <p className="min-w-0 flex-1">{toast.message}</p>
      {toast.action ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary-soft"
          onClick={() => {
            toast.action?.onAction();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" className="w-8 px-0" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
        <Icon icon={X} />
      </Button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => setToasts((l) => removeToast(l, id)), []);
  const show = useCallback((input: ToastInput) => {
    const id = `toast-${++counter.current}`;
    setToasts((l) => pushToast(l, id, input));
    return id;
  }, []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 max-md:bottom-20"
      >
        <div aria-live="polite" className="flex flex-col gap-2">
          {toasts.map((t) => (
            <ToastView key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
