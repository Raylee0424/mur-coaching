import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { CreateWorkoutLogDto, ListWorkoutLogsQuery, UpdateWorkoutLogDto } from './dto/workout-log.dto';
import { WorkoutLogView, WorkoutLogsService } from './workout-logs.service';

@Controller()
export class WorkoutLogsController {
  constructor(
    private readonly logs: WorkoutLogsService,
    private readonly access: ClientAccessService,
  ) {}

  @Roles(Role.CLIENT)
  @Post('workout-logs')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWorkoutLogDto): Promise<WorkoutLogView> {
    return this.logs.create(user.id, dto);
  }

  @Get('clients/:clientId/workout-logs')
  async list(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Query() query: ListWorkoutLogsQuery,
  ): Promise<{ items: WorkoutLogView[]; nextCursor: string | null }> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.logs.list(clientId, query);
  }

  @Get('workout-logs/:id')
  async get(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<WorkoutLogView> {
    const log = await this.logs.getById(id);
    await this.access.assertCanAccessClient(user, log.clientId);
    return log;
  }

  @Roles(Role.CLIENT)
  @Patch('workout-logs/:id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutLogDto,
  ): Promise<WorkoutLogView> {
    return this.logs.update(user.id, id, dto);
  }

  @Roles(Role.CLIENT)
  @Delete('workout-logs/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.logs.remove(user.id, id);
  }
}
