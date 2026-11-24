import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { CoachLiveDto, LiveSessionDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { LogLiveSetDto, StartLiveSessionDto } from './live.dto';
import { LiveService } from './live.service';

/** Tenancy: sessions are filtered by coachId; participants and set writes require the client on the accessible roster. */
@Roles(Role.COACH)
@Controller('coach/live-sessions')
export class CoachLiveController {
  constructor(private readonly live: LiveService) {}

  @Get()
  view(@CurrentUser() user: RequestUser): Promise<CoachLiveDto> {
    return this.live.coachView(user.id);
  }

  @Post()
  start(@CurrentUser() user: RequestUser, @Body() dto: StartLiveSessionDto): Promise<LiveSessionDto> {
    return this.live.start(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<LiveSessionDto> {
    return this.live.get(user.id, id);
  }

  @Post(':id/sets')
  logSet(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: LogLiveSetDto): Promise<LiveSessionDto> {
    return this.live.logSet(user.id, id, dto);
  }

  @Delete(':id/sets/:setLogId')
  removeSet(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('setLogId') setLogId: string): Promise<LiveSessionDto> {
    return this.live.removeSet(user.id, id, setLogId);
  }

  @Post(':id/end')
  @HttpCode(204)
  end(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.live.end(user.id, id);
  }
}

@Roles(Role.CLIENT)
@Controller('me/live-session')
export class MeLiveController {
  constructor(private readonly live: LiveService) {}

  @Get()
  async mine(@CurrentUser() user: RequestUser): Promise<{ session: LiveSessionDto | null }> {
    return { session: await this.live.mine(user.id) };
  }
}
