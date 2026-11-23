import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="space-y-2">
      <h1 className="font-display text-h1 font-semibold">{title}</h1>
      {subtitle ? <p className="text-body text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function StatusIcon({ tone, icon }: { tone: 'primary' | 'emerald' | 'amber' | 'rose'; icon: LucideIcon }) {
  const cls = { primary: 'text-ink', emerald: 'text-emerald', amber: 'text-amber', rose: 'text-rose' }[tone];
  return (
    <span className={`inline-flex size-12 items-center justify-center rounded-md border border-line bg-raised ${cls}`}>
      <Icon icon={icon} size={20} />
    </span>
  );
}
