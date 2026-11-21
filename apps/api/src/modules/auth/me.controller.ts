import { Body, Controller, HttpCode, Patch, Post } from '@nestjs/common';
import type { AuthUser } from '@coaching/shared';
import { CurrentUser, RequestUser } from '../../common';
import { AuthService } from './auth.service';
import { UpdateMeDto } from './dto/update-me.dto';

/** Self-service account endpoints for any signed-in user. */
@Controller('me')
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @Patch()
  update(@CurrentUser() user: RequestUser, @Body() dto: UpdateMeDto): Promise<AuthUser> {
    return this.auth.updateMe(user.id, dto);
  }

  /** Marks onboarding finished. Idempotent: replaying onboarding keeps the first date. */
  @Post('onboarding/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: RequestUser): Promise<AuthUser> {
    return this.auth.completeOnboarding(user.id);
  }
}
