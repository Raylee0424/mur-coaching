import type { Role } from './enums';

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
}
