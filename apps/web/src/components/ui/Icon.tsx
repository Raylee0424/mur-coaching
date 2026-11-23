import type { LucideIcon, LucideProps } from 'lucide-react';

/** Every icon in the app goes through here: 16px, 1.5 stroke, decorative unless labelled. */
export function Icon({
  icon: I,
  size = 16,
  label,
  ...rest
}: { icon: LucideIcon; size?: 14 | 16 | 20; label?: string } & Omit<LucideProps, 'size' | 'ref'>) {
  return (
    <I
      size={size}
      strokeWidth={1.5}
      absoluteStrokeWidth
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
      {...rest}
    />
  );
}
