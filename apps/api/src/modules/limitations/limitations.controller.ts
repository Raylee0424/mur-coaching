import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { LimitationDto } from '@coaching/shared';
import { CurrentUser, RequestUser } from '../../common';
import { CreateLimitationDto, UpdateLimitationDto } from './dto/limitations.dto';
import { LimitationsService } from './limitations.service';

/** Coach (via CoachClient tenancy) and the client themselves; denials are 404 from ClientAccessService. */
@Controller('clients/:clientId/limitations')
export class LimitationsController {
  constructor(private readonly limitations: LimitationsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Query('active') active?: string): Promise<LimitationDto[]> {
    return this.limitations.list(user, clientId, active === 'true');
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Body() dto: CreateLimitationDto): Promise<LimitationDto> {
    return this.limitations.create(user, clientId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLimitationDto,
  ): Promise<LimitationDto> {
    return this.limitations.update(user, clientId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Param('id') id: string): Promise<void> {
    return this.limitations.remove(user, clientId, id);
  }
}
