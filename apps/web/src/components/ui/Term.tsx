'use client';

import clsx from 'clsx';
import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { GLOSSARY, type GlossaryId } from '@coaching/shared';

const GAP = 6;
const EDGE = 8;
const MAX_WIDTH = 256;

/**
 * Jargon with a plain-language definition from `GLOSSARY`.
 * Dotted underline; the popover opens on hover, keyboard focus or tap, and closes on Esc, blur or a second tap.
 * Positioned `fixed` and clamped to the viewport so it never widens the page.
 */
export function Term({ id, children, className }: { id: GlossaryId; children?: ReactNode; className?: string }) {
  const entry = GLOSSARY[id];
  const tipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });

  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const close = () => {
    clearTimeout(leaveTimer.current);
    setOpen(false);
    setPinned(false);
  };
  // Hover: a short grace period lets the pointer cross the gap into the popover (WCAG 1.4.13).
  const hoverIn = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(leaveTimer.current);
    setOpen(true);
  };
  const hoverOut = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || pinned) return;
    leaveTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const tip = tipRef.current?.getBoundingClientRect();
      if (!trigger || !tip) return;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const width = Math.min(MAX_WIDTH, vw - 2 * EDGE);
      const left = Math.min(Math.max(trigger.left + trigger.width / 2 - width / 2, EDGE), vw - width - EDGE);
      const below = trigger.bottom + GAP;
      const top = below + tip.height > vh - EDGE && trigger.top - GAP - tip.height > EDGE ? trigger.top - GAP - tip.height : below;
      setStyle({ top, left, width });
    };
    place();
    // A fixed popover would drift from its word on scroll; close instead of chasing it.
    const onScroll = () => {
      setOpen(false);
      setPinned(false);
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
      setStyle({ visibility: 'hidden' });
    };
  }, [open]);

  return (
    <span className="inline" onPointerEnter={hoverIn} onPointerLeave={hoverOut}>
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={tipId}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onClick={() => {
          if (pinned) close();
          else {
            setPinned(true);
            setOpen(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation();
            close();
          }
        }}
        className={clsx(
          'inline cursor-help rounded-sm underline decoration-dotted decoration-1 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          className,
        )}
      >
        {children ?? entry.term}
      </button>
      <span
        ref={tipRef}
        id={tipId}
        role="tooltip"
        style={style}
        className={clsx(
          'fixed z-[70] rounded-md border border-line bg-raised px-3 py-2 text-left font-sans text-label-md font-normal normal-case tracking-normal text-ink shadow-lg',
          !open && 'hidden',
        )}
      >
        <span className="block font-semibold text-primary">{entry.term}</span>
        {entry.definition}
      </span>
    </span>
  );
}
