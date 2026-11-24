import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { AutomationCandidateDto, AutomationRuleDto, AutomationsDto, RunAutomationsResultDto } from '@coaching/shared';
import { CurrentUser, RateLimit, RequestUser, Roles } from '../../common';
import { SaveAutomationRuleDto } from './automations.dto';
import { AutomationsService } from './automations.service';

/** Tenancy: rules are filtered by coachId; triggers only consider clients on the coach's accessible roster. */
@Roles(Role.COACH)
@Controller('coach/automations')
export class CoachAutomationsController {
  constructor(private readonly automations: AutomationsService) {}

  @Get()
  overview(@CurrentUser() user: RequestUser): Promise<AutomationsDto> {
    return this.automations.overview(user.id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: SaveAutomationRuleDto): Promise<AutomationRuleDto> {
    return this.automations.create(user.id, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: SaveAutomationRuleDto): Promise<AutomationRuleDto> {
    return this.automations.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.automations.remove(user.id, id);
  }

  /** What the rule would send right now. Writes nothing. */
  @Post(':id/dry-run')
  @HttpCode(200)
  dryRun(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<AutomationCandidateDto[]> {
    return this.automations.dryRun(user.id, id);
  }

  /** Fires this coach's enabled rules now instead of waiting for the worker. */
  @Post('run')
  @HttpCode(200)
  @RateLimit(6, 60_000)
  async run(@CurrentUser() user: RequestUser): Promise<RunAutomationsResultDto> {
    return { sent: await this.automations.runDue(new Date(), user.id) };
  }
}
