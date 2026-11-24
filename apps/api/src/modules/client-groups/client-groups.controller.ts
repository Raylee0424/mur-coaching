import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { ClientGroupDto, GroupAssignOutcome } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientGroupsService } from './client-groups.service';
import { GroupAssignDto, SaveClientGroupDto } from './dto/client-group.dto';

@Roles(Role.COACH)
@Controller('client-groups')
export class ClientGroupsController {
  constructor(private readonly groups: ClientGroupsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser): Promise<ClientGroupDto[]> {
    return this.groups.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: SaveClientGroupDto): Promise<ClientGroupDto> {
    return this.groups.create(user.id, dto);
  }

  @Put(':id')
  replace(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: SaveClientGroupDto): Promise<ClientGroupDto> {
    return this.groups.replace(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.groups.remove(user.id, id);
  }

  /** Bulk assign: one assignment per member; the response lists each outcome. */
  @Post(':id/assign')
  assign(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: GroupAssignDto): Promise<GroupAssignOutcome[]> {
    return this.groups.assign(user.id, id, dto);
  }
}
