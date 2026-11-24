import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { BodyTrendDto, ClientPhotosDto, CoachProgressDto, CreateProgressPhotoResponse } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { CreateProgressPhotoDto, LogBodyweightDto, SaveBodyGoalDto, UpdateProgressPhotoDto } from './body.dto';
import { BodyService } from './body.service';

/** Owner-only routes: every query is scoped to the signed-in client. */
@Roles(Role.CLIENT)
@Controller('me')
export class MeBodyController {
  constructor(private readonly body: BodyService) {}

  @Get('body')
  trend(@CurrentUser() user: RequestUser): Promise<BodyTrendDto> {
    return this.body.trend(user.id);
  }

  @Put('body/entries')
  @HttpCode(204)
  log(@CurrentUser() user: RequestUser, @Body() dto: LogBodyweightDto): Promise<void> {
    return this.body.log(user.id, dto.date, dto.weightKg);
  }

  @Delete('body/entries/:date')
  @HttpCode(204)
  removeEntry(@CurrentUser() user: RequestUser, @Param('date') date: string): Promise<void> {
    return this.body.removeEntry(user.id, date);
  }

  @Put('body/goal')
  @HttpCode(204)
  saveGoal(@CurrentUser() user: RequestUser, @Body() dto: SaveBodyGoalDto): Promise<void> {
    return this.body.saveGoal(user.id, dto);
  }

  @Delete('body/goal')
  @HttpCode(204)
  removeGoal(@CurrentUser() user: RequestUser): Promise<void> {
    return this.body.removeGoal(user.id);
  }

  @Get('progress-photos')
  photos(@CurrentUser() user: RequestUser): Promise<ClientPhotosDto> {
    return this.body.photos(user.id);
  }

  @Post('progress-photos')
  reserve(@CurrentUser() user: RequestUser, @Body() dto: CreateProgressPhotoDto): Promise<CreateProgressPhotoResponse> {
    return this.body.reservePhoto(user.id, dto);
  }

  @Post('progress-photos/:id/complete')
  @HttpCode(204)
  complete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.body.completePhoto(user.id, id);
  }

  @Patch('progress-photos/:id')
  @HttpCode(204)
  share(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateProgressPhotoDto): Promise<void> {
    return this.body.sharePhoto(user.id, id, dto.sharedWithCoach);
  }

  @Delete('progress-photos/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.body.deletePhoto(user.id, id);
  }
}

/** Coach sees only photos the client shared. */
@Roles(Role.COACH)
@Controller('clients/:clientId/progress')
export class CoachProgressController {
  constructor(
    private readonly body: BodyService,
    private readonly access: ClientAccessService,
  ) {}

  @Get()
  async get(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string): Promise<CoachProgressDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.body.coachProgress(clientId);
  }
}
