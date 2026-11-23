import type { ReactNode } from 'react';

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong px-6 py-10 text-left">
      <h2 className="font-sans text-ui font-semibold text-ink" style={{ fontStretch: '100%', letterSpacing: 0 }}>
        {title}
      </h2>
      {children ? <div className="mt-1 text-meta text-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
