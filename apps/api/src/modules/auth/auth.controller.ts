import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { AuthTokenResponse, AuthUser } from '@coaching/shared';
import { CurrentUser, Public, RateLimit, RequestUser } from '../../common';

const MINUTE = 60_000;
import { AuthService } from './auth.service';
import { DemoLoginDto } from './dto/demo-login.dto';
import { ForgotPasswordDto, ResetPasswordDto, SignupDto, VerifyEmailDto } from './dto/account.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @RateLimit(10, MINUTE)
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthTokenResponse> {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @RateLimit(30, MINUTE)
  @Post('demo')
  @HttpCode(200)
  demo(@Body() dto: DemoLoginDto): Promise<AuthTokenResponse> {
    return this.auth.demoLogin(dto.role);
  }

  @Public()
  @RateLimit(5, 15 * MINUTE)
  @Post('signup')
  signup(@Body() dto: SignupDto): Promise<AuthTokenResponse> {
    return this.auth.signup(dto);
  }

  @RateLimit(10, 15 * MINUTE)
  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@CurrentUser() user: RequestUser, @Body() dto: VerifyEmailDto): Promise<AuthUser> {
    return this.auth.verifyEmail(user.id, dto.code);
  }

  @RateLimit(5, 15 * MINUTE)
  @Post('verify-email/resend')
  @HttpCode(204)
  resend(@CurrentUser() user: RequestUser): Promise<void> {
    return this.auth.resendVerification(user.id);
  }

  @Public()
  @RateLimit(5, 15 * MINUTE)
  @Post('forgot-password')
  @HttpCode(204)
  forgot(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @RateLimit(10, 15 * MINUTE)
  @Post('reset-password')
  @HttpCode(204)
  reset(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.auth.resetPassword(dto);
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser): Promise<AuthUser> {
    return this.auth.me(user.id);
  }
}
