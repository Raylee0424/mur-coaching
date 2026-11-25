import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { GroupDetailDto, GroupLeaderboardDto, SharedWorkoutDto, SocialOverviewDto } from '@coaching/shared';
import { CurrentUser, RateLimit, RequestUser, Roles } from '../../common';
import { BlockDto, CreateGroupDto, CreateReportDto, FriendRequestDto, JoinGroupDto, ShareWorkoutDto, UpdateMembershipDto } from './social.dto';
import { SocialService } from './social.service';

/** Athletes only. Every group route requires membership (404 otherwise). */
@Roles(Role.CLIENT)
@Controller('me')
export class MeSocialController {
  constructor(private readonly social: SocialService) {}

  @Get('social')
  overview(@CurrentUser() user: RequestUser): Promise<SocialOverviewDto> {
    return this.social.overview(user.id);
  }

  @Post('groups')
  @RateLimit(10, 60_000)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateGroupDto): Promise<GroupDetailDto> {
    return this.social.create(user.id, dto);
  }

  /** Brute-forcing codes is the main abuse path: tight per-IP limit. */
  @Post('groups/join')
  @HttpCode(200)
  @RateLimit(10, 60_000)
  join(@CurrentUser() user: RequestUser, @Body() dto: JoinGroupDto): Promise<GroupDetailDto> {
    return this.social.join(user.id, dto.inviteCode);
  }

  @Get('groups/:id')
  detail(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<GroupDetailDto> {
    return this.social.detail(user.id, id);
  }

  @Delete('groups/:id/membership')
  @HttpCode(204)
  leave(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.social.leave(user.id, id);
  }

  @Patch('groups/:id/membership')
  @HttpCode(204)
  membership(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateMembershipDto): Promise<void> {
    return this.social.setShareStats(user.id, id, dto.shareStats);
  }

  @Post('groups/:id/invite-code')
  @HttpCode(200)
  rotate(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<GroupDetailDto> {
    return this.social.rotateCode(user.id, id);
  }

  @Delete('groups/:id/members/:userId')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('userId') target: string): Promise<void> {
    return this.social.removeMember(user.id, id, target);
  }

  @Get('groups/:id/feed')
  feed(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<SharedWorkoutDto[]> {
    return this.social.feed(user.id, id);
  }

  @Post('groups/:id/shares')
  @RateLimit(30, 60_000)
  share(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ShareWorkoutDto): Promise<SharedWorkoutDto> {
    return this.social.share(user.id, id, dto);
  }

  @Delete('shares/:id')
  @HttpCode(204)
  unshare(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.social.deleteShare(user.id, id);
  }

  @Get('groups/:id/leaderboard')
  leaderboard(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<GroupLeaderboardDto> {
    return this.social.leaderboard(user.id, id);
  }

  @Post('friends')
  @HttpCode(204)
  @RateLimit(30, 60_000)
  requestFriend(@CurrentUser() user: RequestUser, @Body() dto: FriendRequestDto): Promise<void> {
    return this.social.requestFriend(user.id, dto.userId);
  }

  @Put('friends/:id/accept')
  @HttpCode(204)
  accept(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.social.acceptFriend(user.id, id);
  }

  @Delete('friends/:id')
  @HttpCode(204)
  unfriend(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.social.removeFriend(user.id, id);
  }

  @Post('blocks')
  @HttpCode(204)
  block(@CurrentUser() user: RequestUser, @Body() dto: BlockDto): Promise<void> {
    return this.social.block(user.id, dto.userId);
  }

  @Delete('blocks/:userId')
  @HttpCode(204)
  unblock(@CurrentUser() user: RequestUser, @Param('userId') target: string): Promise<void> {
    return this.social.unblock(user.id, target);
  }

  @Post('reports')
  @HttpCode(204)
  @RateLimit(10, 60_000)
  report(@CurrentUser() user: RequestUser, @Body() dto: CreateReportDto): Promise<void> {
    return this.social.report(user.id, dto);
  }
}
