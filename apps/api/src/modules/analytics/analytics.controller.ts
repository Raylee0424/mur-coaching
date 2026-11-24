import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsOptional, Matches } from 'class-validator';
import { Feature, Role } from '@coaching/shared';
import type { MuscleAnalyticsDto } from '@coaching/shared';
import { CurrentUser, RequestUser, RequiresFeature, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { MuscleAnalyticsService } from './muscle-analytics.service';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class WindowQuery {
  @IsOptional() @Matches(DATE, { message: 'Dates use YYYY-MM-DD.' }) from?: string;
  @IsOptional() @Matches(DATE, { message: 'Dates use YYYY-MM-DD.' }) to?: string;
}

/** Athlete Pro feature: 402 without MUSCLE_ANALYTICS. */
@Roles(Role.CLIENT)
@Controller('me/analytics')
export class MeAnalyticsController {
  constructor(private readonly analytics: MuscleAnalyticsService) {}

  @Get('muscles')
  @RequiresFeature(Feature.MUSCLE_ANALYTICS)
  muscles(@CurrentUser() user: RequestUser, @Query() q: WindowQuery): Promise<MuscleAnalyticsDto> {
    return this.analytics.forClient(user.id, q.from, q.to);
  }
}

/** Coach read of a rostered client's muscle volume (CoachClient tenancy, 404 across tenants). */
@Roles(Role.COACH)
@Controller('clients/:clientId/analytics')
export class CoachAnalyticsController {
  constructor(
    private readonly analytics: MuscleAnalyticsService,
    private readonly access: ClientAccessService,
  ) {}

  @Get('muscles')
  async muscles(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Query() q: WindowQuery): Promise<MuscleAnalyticsDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.analytics.forClient(clientId, q.from, q.to);
  }
}
