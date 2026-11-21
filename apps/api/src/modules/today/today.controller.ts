import { Controller, Get } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { TodayDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { TodayService } from './today.service';

@Controller('me/today')
export class TodayController {
  constructor(private readonly today: TodayService) {}

  @Roles(Role.CLIENT)
  @Get()
  get(@CurrentUser() user: RequestUser): Promise<TodayDto> {
    return this.today.get(user.id);
  }
}
