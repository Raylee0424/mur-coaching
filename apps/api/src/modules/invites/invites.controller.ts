import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { AcceptInviteResponse, InvitePreviewDto } from '@coaching/shared';
import { Public, RateLimit } from '../../common';
import { AcceptInviteDto } from './dto/invites.dto';
import { InvitesService } from './invites.service';

/** Public endpoints behind the emailed/copied invite link. Coach-side routes live in ClientsController. */
@Controller('invites')
export class PublicInvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Public()
  @RateLimit(30, 60_000)
  @Get(':token')
  preview(@Param('token') token: string): Promise<InvitePreviewDto> {
    return this.invites.preview(token);
  }

  @Public()
  @RateLimit(10, 15 * 60_000)
  @Post(':token/accept')
  @HttpCode(200)
  accept(@Param('token') token: string, @Body() dto: AcceptInviteDto): Promise<AcceptInviteResponse> {
    return this.invites.accept(token, dto);
  }
}
