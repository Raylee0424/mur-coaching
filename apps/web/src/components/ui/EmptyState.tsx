import type { ReactNode } from 'react';

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-card/50 px-6 py-10 text-left">
      <h2 className="font-display text-title-md text-ink">{title}</h2>
      {children ? <div className="mt-1 text-body-md text-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
