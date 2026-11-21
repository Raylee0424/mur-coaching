import { Body, Controller, Delete, Get, HttpCode, Post, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { CoachEngineRulesDto, EnginePreviewResponse } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { EnginePreviewDto, EngineRulesDto } from './dto/engine-rules.dto';
import { EngineRulesService } from './engine-rules.service';
import { ProgressionService } from './progression.service';

@Roles(Role.COACH)
@Controller('coach/engine-rules')
export class EngineRulesController {
  constructor(
    private readonly rules: EngineRulesService,
    private readonly progression: ProgressionService,
    private readonly access: ClientAccessService,
  ) {}

  @Get()
  get(@CurrentUser() user: RequestUser): Promise<CoachEngineRulesDto> {
    return this.rules.get(user.id);
  }

  @Put()
  replace(@CurrentUser() user: RequestUser, @Body() dto: EngineRulesDto): Promise<CoachEngineRulesDto> {
    return this.rules.replace(user.id, dto);
  }

  @Delete()
  reset(@CurrentUser() user: RequestUser): Promise<CoachEngineRulesDto> {
    return this.rules.reset(user.id);
  }

  /** "With these rules, X's squat would be …". Uses draft rules; persists nothing. */
  @Post('preview')
  @HttpCode(200)
  async preview(@CurrentUser() user: RequestUser, @Body() dto: EnginePreviewDto): Promise<EnginePreviewResponse> {
    await this.access.assertCanAccessClient(user, dto.clientId);
    return this.progression.preview(dto.clientId, dto.exerciseId, dto.rules);
  }
}
