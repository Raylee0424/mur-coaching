'use client';

import clsx from 'clsx';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button, type ButtonVariant } from './Button';

export type SheetVariant = 'modal' | 'drawer' | 'bottom';

const PLACEMENT: Record<SheetVariant, string> = {
  // Bottom sheet on mobile; centred modal on md+.
  modal: 'm-auto mb-0 w-full max-w-lg rounded-t-lg md:mb-auto md:rounded-lg',
  // Bottom sheet on mobile; right-hand drawer on md+.
  drawer: 'm-auto mb-0 w-full rounded-t-lg md:my-0 md:ml-auto md:mr-0 md:h-dvh md:max-h-dvh md:w-[560px] md:max-w-[560px] md:rounded-none md:rounded-l-lg',
  bottom: 'm-auto mb-0 w-full max-w-lg rounded-t-lg',
};

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: SheetVariant;
  children: ReactNode;
}

/** Native <dialog>: focus trap, Esc and inert background come from the browser. */
export function Sheet({ open, onClose, title, description, variant = 'modal', children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={clsx(
        'max-h-[90dvh] overflow-y-auto border border-line bg-card p-0 text-ink backdrop:bg-canvas/80 backdrop:backdrop-blur-sm',
        PLACEMENT[variant],
      )}
    >
      <div className="space-y-4 p-5 md:p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            ✕
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

interface SheetButtonProps extends Omit<SheetProps, 'open' | 'onClose'> {
  label: string;
  variant?: SheetVariant;
  buttonVariant?: ButtonVariant;
  buttonClassName?: string;
}

/** Uncontrolled trigger + sheet for read-only content. */
export function SheetButton({ label, buttonVariant = 'secondary', buttonClassName, ...sheet }: SheetButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={buttonVariant} className={buttonClassName} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet {...sheet} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
