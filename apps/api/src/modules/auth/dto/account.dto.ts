import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH, PASSWORD_RULE_MESSAGE, Role } from '@coaching/shared';
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SignupRequest,
  VerifyEmailRequest,
} from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const normEmail = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** Decorators for the shared password rule: >= 8 chars with a digit. */
export const PASSWORD_MAX_LENGTH = 128; // bcrypt truncates at 72 bytes; cap input to keep hashing cheap

export class SignupDto implements SignupRequest {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @Transform(normEmail)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_RULE_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(/\d/, { message: PASSWORD_RULE_MESSAGE })
  password!: string;

  @IsIn(Object.values(Role))
  role!: Role;
}

export class VerifyEmailDto implements VerifyEmailRequest {
  @Transform(trim)
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}

export class ForgotPasswordDto implements ForgotPasswordRequest {
  @Transform(normEmail)
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto implements ResetPasswordRequest {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  token!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_RULE_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(/\d/, { message: PASSWORD_RULE_MESSAGE })
  password!: string;
}
