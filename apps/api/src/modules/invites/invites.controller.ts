import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { AcceptInviteResponse, InvitePreviewDto } from '@coaching/shared';
import { Public } from '../../common';
import { AcceptInviteDto } from './dto/invites.dto';
import { InvitesService } from './invites.service';

/** Public endpoints behind the emailed/copied invite link. Coach-side routes live in ClientsController. */
@Controller('invites')
export class PublicInvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Public()
  @Get(':token')
  preview(@Param('token') token: string): Promise<InvitePreviewDto> {
    return this.invites.preview(token);
  }

  @Public()
  @Post(':token/accept')
  @HttpCode(200)
  accept(@Param('token') token: string, @Body() dto: AcceptInviteDto): Promise<AcceptInviteResponse> {
    return this.invites.accept(token, dto);
  }
}
