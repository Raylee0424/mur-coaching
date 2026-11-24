import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { IsDateString } from 'class-validator';
import { Role } from '@coaching/shared';
import type { ScheduledWorkoutDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { UpdateScheduledWorkoutDto } from './dto/schedule.dto';
import { ScheduleService } from './schedule.service';

class ScheduleRangeQuery {
  @IsDateString({ strict: true })
  from!: string;

  @IsDateString({ strict: true })
  to!: string;
}

@Controller('clients/:clientId/scheduled-workouts')
export class ScheduleController {
  constructor(
    private readonly schedule: ScheduleService,
    private readonly access: ClientAccessService,
  ) {}

  @Roles(Role.COACH)
  @Get()
  async list(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Query() q: ScheduleRangeQuery): Promise<ScheduledWorkoutDto[]> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.schedule.list(clientId, q.from, q.to);
  }

  @Roles(Role.COACH)
  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledWorkoutDto,
  ): Promise<ScheduledWorkoutDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.schedule.update(clientId, id, dto);
  }
}
