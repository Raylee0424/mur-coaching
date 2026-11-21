import { Body, Controller, Get, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { MeProfileDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientProfileInputDto } from './dto/client-settings.dto';
import { BaselinesDto } from './dto/me-profile.dto';
import { MeProfileService } from './me-profile.service';

@Roles(Role.CLIENT)
@Controller('me')
export class MeProfileController {
  constructor(private readonly profile: MeProfileService) {}

  @Get('profile')
  get(@CurrentUser() user: RequestUser): Promise<MeProfileDto> {
    return this.profile.get(user.id);
  }

  @Put('profile')
  update(@CurrentUser() user: RequestUser, @Body() dto: ClientProfileInputDto): Promise<MeProfileDto> {
    return this.profile.updateProfile(user.id, dto);
  }

  @Put('baselines')
  setBaselines(@CurrentUser() user: RequestUser, @Body() dto: BaselinesDto): Promise<MeProfileDto> {
    return this.profile.setBaselines(user.id, dto.baselines);
  }
}
