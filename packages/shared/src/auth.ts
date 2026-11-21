import type { Role, WeightUnit } from './enums';
import type { IsoDateString } from './common';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface DemoLoginRequest {
  role: Role;
}

export interface JwtPayload {
  sub: string;
  role: Role;
}

export interface AuthTokenResponse {
  accessToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isDemo: boolean;
  /** Set for CLIENT users with an active coach. */
  coachId: string | null;
  /** Set for COACH users: number of ACTIVE clients. */
  activeClientCount: number | null;
  weightUnit: WeightUnit;
  displayName: string | null;
  /** Null until the user finishes onboarding. */
  onboardedAt: IsoDateString | null;
}

export interface UpdateMeRequest {
  name?: string;
  displayName?: string;
  weightUnit?: WeightUnit;
}
