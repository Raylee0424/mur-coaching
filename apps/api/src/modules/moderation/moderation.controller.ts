import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import type { ModerationReportDto, ModerationReportPage } from '@coaching/shared';
import { RateLimit } from '../../common';
import { ListReportsQueryDto, UpdateReportStatusDto } from './moderation.dto';
import { ModerationService } from './moderation.service';
import { ModeratorGuard } from './moderator.guard';

/** Platform moderators only (MODERATOR_EMAILS). Everyone else gets 404 from both routes. Any role. */
@UseGuards(ModeratorGuard)
@Controller('moderation/reports')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get()
  list(@Query() query: ListReportsQueryDto): Promise<ModerationReportPage> {
    return this.moderation.list(query);
  }

  @Patch(':id')
  @RateLimit(60, 60_000)
  setStatus(@Param('id') id: string, @Body() dto: UpdateReportStatusDto): Promise<ModerationReportDto> {
    return this.moderation.setStatus(id, dto.status);
  }
}
