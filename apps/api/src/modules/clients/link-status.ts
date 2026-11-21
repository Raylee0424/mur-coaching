import { CoachClientStatus } from '@prisma/client';

/** Link statuses under which the coach still has access to the client (and the client to the coach's library). */
export const ACCESSIBLE_LINK_STATUSES: readonly CoachClientStatus[] = [CoachClientStatus.ACTIVE, CoachClientStatus.PAUSED];

export const isAccessibleLink = (status: CoachClientStatus | undefined | null): boolean =>
  status != null && ACCESSIBLE_LINK_STATUSES.includes(status);
