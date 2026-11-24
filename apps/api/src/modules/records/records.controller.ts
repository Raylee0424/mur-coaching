import { Controller, Get, Param } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { ExerciseStatsDto, RecordsDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { RecordsService } from './records.service';

/** Athlete-only: records and stats are always the caller's own. */
@Roles(Role.CLIENT)
@Controller()
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get('me/records')
  list(@CurrentUser() user: RequestUser): Promise<RecordsDto> {
    return this.records.list(user.id);
  }

  @Get('exercises/:id/stats')
  stats(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<ExerciseStatsDto> {
    return this.records.stats(user.id, id);
  }
}
