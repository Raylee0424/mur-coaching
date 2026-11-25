import { Body, Controller, Get, HttpCode, Put, Query } from '@nestjs/common';
import { HEALTH_LIMITS, Role } from '@coaching/shared';
import type { HealthOverviewDto, SyncHealthMetricsResponse } from '@coaching/shared';
import { CurrentUser, RateLimit, RequestUser, Roles } from '../../common';
import { SaveStepGoalDto, SyncHealthMetricsDto } from './health.dto';
import { HealthService } from './health.service';

/** Owner-only steps, sleep, HRV and resting HR. Native bridges later post to the same idempotent sync route. */
@Roles(Role.CLIENT)
@Controller('me/health')
export class MeHealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  overview(@CurrentUser() user: RequestUser, @Query('days') days?: string): Promise<HealthOverviewDto> {
    const n = Number(days);
    const clamped = Number.isInteger(n) ? Math.min(HEALTH_LIMITS.maxDays, Math.max(HEALTH_LIMITS.minDays, n)) : HEALTH_LIMITS.defaultDays;
    return this.health.overview(user.id, clamped);
  }

  @Put('metrics')
  @RateLimit(60, 60_000)
  sync(@CurrentUser() user: RequestUser, @Body() dto: SyncHealthMetricsDto): Promise<SyncHealthMetricsResponse> {
    return this.health.sync(user.id, dto);
  }

  @Put('step-goal')
  @HttpCode(204)
  goal(@CurrentUser() user: RequestUser, @Body() dto: SaveStepGoalDto): Promise<void> {
    return this.health.saveGoal(user.id, dto.dailySteps);
  }
}
