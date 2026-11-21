import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { AuthTokenResponse, AuthUser } from '@coaching/shared';
import { CurrentUser, Public, RequestUser } from '../../common';
import { AuthService } from './auth.service';
import { DemoLoginDto } from './dto/demo-login.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthTokenResponse> {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('demo')
  @HttpCode(200)
  demo(@Body() dto: DemoLoginDto): Promise<AuthTokenResponse> {
    return this.auth.demoLogin(dto.role);
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser): Promise<AuthUser> {
    return this.auth.me(user.id);
  }
}
