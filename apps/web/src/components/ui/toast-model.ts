export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastInput {
  message: string;
  tone?: 'ok' | 'error' | 'neutral';
  action?: ToastAction;
  /** Default 5000; errors 8000. */
  durationMs?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: 'ok' | 'error' | 'neutral';
  action?: ToastAction;
  durationMs: number;
}

export const MAX_VISIBLE = 3;

export function toastDuration(input: ToastInput): number {
  return input.durationMs ?? (input.tone === 'error' ? 8000 : 5000);
}

/** Append a toast; the oldest drops once more than MAX_VISIBLE are queued. */
export function pushToast(list: readonly ToastItem[], id: string, input: ToastInput): ToastItem[] {
  const item: ToastItem = {
    id,
    message: input.message,
    tone: input.tone ?? 'neutral',
    action: input.action,
    durationMs: toastDuration(input),
  };
  return [...list, item].slice(-MAX_VISIBLE);
}

export function removeToast(list: readonly ToastItem[], id: string): ToastItem[] {
  return list.filter((t) => t.id !== id);
}
