import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { CoachInboxDto, MessageDto, MessageThreadDto } from '@coaching/shared';
import { CurrentUser, RateLimit, RequestUser, Roles } from '../../common';
import { SendMessageDto, ThreadQueryDto } from './messaging.dto';
import { MessagingService } from './messaging.service';

const SEND_LIMIT = [30, 60_000] as const;

/** Coach threads, keyed by client id. Tenancy: `asCoach` 404s outside the coach's accessible roster. */
@Roles(Role.COACH)
@Controller('coach/conversations')
export class CoachMessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  inbox(@CurrentUser() user: RequestUser): Promise<CoachInboxDto> {
    return this.messaging.coachInbox(user.id);
  }

  @Get(':clientId/messages')
  async thread(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Query() query: ThreadQueryDto): Promise<MessageThreadDto> {
    return this.messaging.thread(await this.messaging.asCoach(user.id, clientId), query);
  }

  @Post(':clientId/messages')
  @RateLimit(...SEND_LIMIT)
  async send(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Body() dto: SendMessageDto): Promise<MessageDto> {
    return this.messaging.send(await this.messaging.asCoach(user.id, clientId), dto.body);
  }

  @Post(':clientId/read')
  @HttpCode(204)
  async read(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string): Promise<void> {
    await this.messaging.markRead(await this.messaging.asCoach(user.id, clientId));
  }
}

@Roles(Role.CLIENT)
@Controller('me/conversation')
export class MeMessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('messages')
  async thread(@CurrentUser() user: RequestUser, @Query() query: ThreadQueryDto): Promise<MessageThreadDto> {
    return this.messaging.thread(await this.messaging.asClient(user.id), query);
  }

  @Post('messages')
  @RateLimit(...SEND_LIMIT)
  async send(@CurrentUser() user: RequestUser, @Body() dto: SendMessageDto): Promise<MessageDto> {
    return this.messaging.send(await this.messaging.asClient(user.id), dto.body);
  }

  @Post('read')
  @HttpCode(204)
  async read(@CurrentUser() user: RequestUser): Promise<void> {
    await this.messaging.markRead(await this.messaging.asClient(user.id));
  }
}
