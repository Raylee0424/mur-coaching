import { CoachClientStatus } from '@coaching/shared';
import type { BadgeTone } from '@/components/ui/Badge';

export const CLIENT_STATUS_META: Record<CoachClientStatus, { label: string; tone: BadgeTone }> = {
  [CoachClientStatus.ACTIVE]: { label: 'Active', tone: 'emerald' },
  [CoachClientStatus.PAUSED]: { label: 'Paused', tone: 'amber' },
  [CoachClientStatus.ARCHIVED]: { label: 'Archived', tone: 'slate' },
};
