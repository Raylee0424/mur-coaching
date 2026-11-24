import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { IntakeFormDto, LeadBoardDto, LeadDto, PublicIntakeDto } from '@coaching/shared';
import { CurrentUser, Public, RateLimit, RequestUser, Roles } from '../../common';
import { CreateLeadDto, SaveIntakeFormDto, SubmitIntakeDto, UpdateLeadDto } from './dto/leads.dto';
import { IntakeService } from './intake.service';
import { LeadsService } from './leads.service';

/** Pipeline board and intake form settings. Every query is scoped to the signed-in coach. */
@Roles(Role.COACH)
@Controller('coach')
export class CoachLeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly intake: IntakeService,
  ) {}

  @Get('leads')
  board(@CurrentUser() user: RequestUser): Promise<LeadBoardDto> {
    return this.leads.board(user.id);
  }

  @Post('leads')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateLeadDto): Promise<LeadDto> {
    return this.leads.create(user.id, dto);
  }

  @Patch('leads/:id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateLeadDto): Promise<LeadDto> {
    return this.leads.update(user.id, id, dto);
  }

  @Delete('leads/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.leads.remove(user.id, id);
  }

  @Get('intake-form')
  form(@CurrentUser() user: RequestUser): Promise<IntakeFormDto> {
    return this.intake.getForm(user.id);
  }

  @Put('intake-form')
  saveForm(@CurrentUser() user: RequestUser, @Body() dto: SaveIntakeFormDto): Promise<IntakeFormDto> {
    return this.intake.saveForm(user.id, dto);
  }
}

/** The public application form behind `/apply/<slug>`. No session. */
@Controller('intake')
export class PublicIntakeController {
  constructor(private readonly intake: IntakeService) {}

  @Public()
  @RateLimit(60, 60_000)
  @Get(':slug')
  preview(@Param('slug') slug: string): Promise<PublicIntakeDto> {
    return this.intake.preview(slug);
  }

  @Public()
  @RateLimit(5, 15 * 60_000)
  @Post(':slug')
  @HttpCode(200)
  submit(@Param('slug') slug: string, @Body() dto: SubmitIntakeDto): Promise<{ received: true }> {
    return this.intake.submit(slug, dto);
  }
}
