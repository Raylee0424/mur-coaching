import { IsEmail, IsString, MinLength } from 'class-validator';
import type { LoginRequest } from '@coaching/shared';

export class LoginDto implements LoginRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
