import type { ReactNode } from 'react';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-card px-6 py-10 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
    </div>
  );
}
