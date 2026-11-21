import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export function ComingSoon({ feature, children }: { feature: string; children?: string }) {
  return (
    <Card className="max-w-xl">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{feature}</h2>
        <Badge tone="indigo">Coming soon</Badge>
      </div>
      <p className="mt-2 text-sm text-muted">
        {children ?? 'This ships once the programs and assignments API is available.'}
      </p>
    </Card>
  );
}
