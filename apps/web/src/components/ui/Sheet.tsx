'use client';

import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Button, buttonClass, type ButtonVariant } from './Button';
import { Icon } from './Icon';

export type SheetVariant = 'modal' | 'drawer' | 'bottom';

const PLACEMENT: Record<SheetVariant, string> = {
  // Bottom sheet on mobile; centred modal on md+.
  modal: 'm-auto mb-0 w-full max-w-lg rounded-t-lg md:mb-auto md:rounded-lg',
  // Bottom sheet on mobile; right-hand 560px drawer on md+, flush to the viewport edge.
  drawer:
    'm-auto mb-0 w-full rounded-t-lg md:my-0 md:ml-auto md:mr-0 md:h-dvh md:max-h-dvh md:w-drawer md:max-w-drawer md:rounded-none md:border-y-0 md:border-r-0',
  bottom: 'm-auto mb-0 w-full max-w-lg rounded-t-lg',
};

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  variant?: SheetVariant;
  /** Pinned under the title (e.g. a verdict strip). */
  headerExtra?: ReactNode;
  /** Pinned footer row. */
  footer?: ReactNode;
  /** Wraps body and footer in one <form> so SubmitButton's useFormStatus sees it. */
  form?: Omit<ComponentProps<'form'>, 'children'>;
  children: ReactNode;
}

/** Native <dialog>: focus trap, Esc and inert background come from the browser. */
export function Sheet({ open, onClose, title, description, variant = 'modal', headerExtra, footer, form, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const body = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer ? (
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-canvas-low px-6 py-4">{footer}</footer>
      ) : null}
    </>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={clsx(
        // `open:flex`, never plain `flex`: plain display would override the UA rule that hides closed dialogs.
        'max-h-[90dvh] overflow-hidden border border-line bg-card p-0 text-ink backdrop:bg-canvas/80 backdrop:backdrop-blur-sm open:flex open:flex-col',
        PLACEMENT[variant],
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-title-lg text-ink">
            {title}
          </h2>
          {description ? <p className="mt-1 text-label-md font-normal text-muted">{description}</p> : null}
          {headerExtra}
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className={buttonClass('ghost', 'w-9 shrink-0 px-0', 'sm')}>
          <Icon icon={X} />
        </button>
      </header>
      {form ? (
        <form {...form} className={clsx('flex min-h-0 flex-1 flex-col', form.className)}>
          {body}
        </form>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{body}</div>
      )}
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
