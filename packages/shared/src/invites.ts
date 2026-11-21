import type { WeightUnit } from './enums';
import type { IsoDateString } from './common';
import type { AuthTokenResponse } from './auth';

export interface CreateInviteRequest {
  name: string;
  email: string;
  phone?: string;
  programId?: string;
  /** `YYYY-MM-DD`; defaults to the acceptance day when a program is set. */
  startDate?: string;
  weightUnit?: WeightUnit;
}

/** A pending (not accepted, not expired-and-cleaned) invite as the coach sees it. Never carries the token. */
export interface InviteDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  programId: string | null;
  programName: string | null;
  startDate: IsoDateString | null;
  weightUnit: WeightUnit;
  expiresAt: IsoDateString;
  createdAt: IsoDateString;
  /** True once past expiresAt (still listed so the coach can revoke and re-send). */
  expired: boolean;
}

export interface CreateInviteResponse {
  invite: InviteDto;
  /** `<WEB_URL>/invite/<token>`. Returned exactly once; only its hash is stored. */
  inviteUrl: string;
}

/** Public preview behind the invite link. */
export interface InvitePreviewDto {
  coachName: string;
  programName: string | null;
  startDate: IsoDateString | null;
  name: string;
  email: string;
}

export interface AcceptInviteRequest {
  name: string;
  password: string;
}

export type AcceptInviteResponse = AuthTokenResponse;
