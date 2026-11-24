import { Body, Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { CoachCycleSummaryDto, CycleContextDto, ReadinessDto, ReadinessHistoryDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { CycleSharingDto, SaveCycleEntryDto, SaveReadinessDto } from './readiness.dto';
import { ReadinessService } from './readiness.service';

/** Owner-only: every query is scoped to the signed-in client. Cycle data is decrypted only here. */
@Roles(Role.CLIENT)
@Controller('me')
export class MeReadinessController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get('readiness')
  history(@CurrentUser() user: RequestUser): Promise<ReadinessHistoryDto> {
    return this.readiness.readiness(user.id);
  }

  @Put('readiness')
  save(@CurrentUser() user: RequestUser, @Body() dto: SaveReadinessDto): Promise<ReadinessDto> {
    return this.readiness.saveReadiness(user.id, dto);
  }

  @Delete('readiness/:date')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('date') date: string): Promise<void> {
    return this.readiness.deleteReadiness(user.id, date);
  }

  @Get('cycle')
  cycle(@CurrentUser() user: RequestUser): Promise<CycleContextDto> {
    return this.readiness.cycle(user.id);
  }

  @Put('cycle/entries')
  @HttpCode(204)
  saveCycle(@CurrentUser() user: RequestUser, @Body() dto: SaveCycleEntryDto): Promise<void> {
    return this.readiness.saveCycleEntry(user.id, dto);
  }

  @Delete('cycle/entries/:date')
  @HttpCode(204)
  removeCycle(@CurrentUser() user: RequestUser, @Param('date') date: string): Promise<void> {
    return this.readiness.deleteCycleEntry(user.id, date);
  }

  @Put('cycle/sharing')
  @HttpCode(204)
  share(@CurrentUser() user: RequestUser, @Body() dto: CycleSharingDto): Promise<void> {
    return this.readiness.setCycleSharing(user.id, dto.sharedWithCoach);
  }
}

/** Phase summary only, and only after the client opts in (403 otherwise). Tenancy first (404 across tenants). */
@Roles(Role.COACH)
@Controller('clients/:clientId/cycle-context')
export class CoachCycleController {
  constructor(
    private readonly readiness: ReadinessService,
    private readonly access: ClientAccessService,
  ) {}

  @Get()
  async get(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string): Promise<CoachCycleSummaryDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.readiness.coachCycleSummary(clientId);
  }
}
