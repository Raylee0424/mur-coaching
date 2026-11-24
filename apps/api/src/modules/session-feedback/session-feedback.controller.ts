import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { SessionFeedbackDto, SessionReviewDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { CreateSessionFeedbackDto, UpdateSessionFeedbackDto } from './dto/session-feedback.dto';
import { SessionFeedbackService } from './session-feedback.service';

@Controller('clients/:clientId')
export class SessionFeedbackController {
  constructor(
    private readonly feedback: SessionFeedbackService,
    private readonly access: ClientAccessService,
  ) {}

  @Roles(Role.COACH)
  @Get('workout-logs/:logId/review')
  async review(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Param('logId') logId: string): Promise<SessionReviewDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.feedback.review(clientId, logId);
  }

  @Roles(Role.COACH)
  @Post('workout-logs/:logId/feedback')
  async create(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Param('logId') logId: string,
    @Body() dto: CreateSessionFeedbackDto,
  ): Promise<SessionFeedbackDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.feedback.create(user.id, clientId, logId, dto);
  }

  @Roles(Role.COACH)
  @Patch('session-feedback/:id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSessionFeedbackDto,
  ): Promise<SessionFeedbackDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.feedback.update(clientId, id, dto);
  }

  @Roles(Role.COACH)
  @Delete('session-feedback/:id')
  @HttpCode(204)
  async remove(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Param('id') id: string): Promise<void> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.feedback.remove(clientId, id);
  }
}
