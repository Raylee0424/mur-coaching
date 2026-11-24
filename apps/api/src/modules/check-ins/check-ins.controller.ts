import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { CheckInInboxDto, CheckInResponseDto, CheckInTemplateDto, ClientCheckInsDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { CreateCheckInScheduleDto, ReviewCheckInDto, SaveCheckInTemplateDto, SubmitCheckInDto } from './check-ins.dto';
import { CheckInsService } from './check-ins.service';

/** Every query is scoped to the signed-in coach's templates and accessible clients. */
@Roles(Role.COACH)
@Controller('coach')
export class CoachCheckInsController {
  constructor(private readonly checkIns: CheckInsService) {}

  @Get('check-ins')
  inbox(@CurrentUser() user: RequestUser): Promise<CheckInInboxDto> {
    return this.checkIns.inbox(user.id);
  }

  @Patch('check-ins/:id')
  @HttpCode(204)
  review(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ReviewCheckInDto): Promise<void> {
    return this.checkIns.review(user.id, id, dto);
  }

  @Post('check-in-templates')
  create(@CurrentUser() user: RequestUser, @Body() dto: SaveCheckInTemplateDto): Promise<CheckInTemplateDto> {
    return this.checkIns.createTemplate(user.id, dto);
  }

  @Put('check-in-templates/:id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: SaveCheckInTemplateDto): Promise<CheckInTemplateDto> {
    return this.checkIns.updateTemplate(user.id, id, dto);
  }

  @Delete('check-in-templates/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.checkIns.deleteTemplate(user.id, id);
  }

  @Post('check-in-schedules')
  assign(@CurrentUser() user: RequestUser, @Body() dto: CreateCheckInScheduleDto): Promise<CheckInTemplateDto> {
    return this.checkIns.assign(user.id, dto);
  }

  @Delete('check-in-schedules/:id')
  @HttpCode(204)
  unassign(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.checkIns.unassign(user.id, id);
  }
}

@Roles(Role.CLIENT)
@Controller('me/check-ins')
export class MeCheckInsController {
  constructor(private readonly checkIns: CheckInsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser): Promise<ClientCheckInsDto> {
    return this.checkIns.forClient(user.id);
  }

  @Post(':scheduleId')
  submit(@CurrentUser() user: RequestUser, @Param('scheduleId') scheduleId: string, @Body() dto: SubmitCheckInDto): Promise<CheckInResponseDto> {
    return this.checkIns.submit(user.id, scheduleId, dto);
  }
}
