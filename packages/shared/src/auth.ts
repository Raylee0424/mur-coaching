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
  /** False until the emailed 6-digit code is confirmed. */
  emailVerified: boolean;
  /** True when the user's email is on the API's MODERATOR_EMAILS allowlist. Shows the Reports nav item. */
  isModerator: boolean;
}

export interface UpdateMeRequest {
  name?: string;
  displayName?: string;
  weightUnit?: WeightUnit;
}

/** Password rule shared by signup, reset and invite acceptance: at least 8 characters, at least one digit. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_RULE_MESSAGE = 'Password must be at least 8 characters and contain a number';
export const isValidPassword = (password: string): boolean =>
  password.length >= PASSWORD_MIN_LENGTH && /\d/.test(password);

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface VerifyEmailRequest {
  /** 6-digit code from the verification email. */
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}
