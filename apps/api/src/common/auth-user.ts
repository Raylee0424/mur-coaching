import type { Role } from '@coaching/shared';

/** Identity attached to req.user after JWT verification. */
export interface RequestUser {
  id: string;
  role: Role;
}
