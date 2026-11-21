import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type {
  ClientOverviewDto,
  ClientSettingsDto,
  CreateInviteResponse,
  InviteDto,
  RosterSummaryDto,
} from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from './client-access.service';
import { InvitesService } from '../invites/invites.service';
import { CreateInviteDto } from '../invites/dto/invites.dto';
import { OverviewService } from './overview.service';
import { RosterService } from './roster.service';
import { OverviewQueryDto, RosterQueryDto } from './dto/roster.dto';
import { ClientView, ClientsService } from './clients.service';
import { ClientSettingsService } from './client-settings.service';
import { UpdateClientSettingsDto } from './dto/client-settings.dto';
import { CreateClientDto, ListClientsQuery, UpdateClientDto } from './dto/clients.dto';

@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clients: ClientsService,
    private readonly access: ClientAccessService,
    private readonly settings: ClientSettingsService,
    private readonly invites: InvitesService,
    private readonly roster: RosterService,
    private readonly overview: OverviewService,
  ) {}

  // Static routes (`invites`, `summary`) must be declared before the `:clientId` routes below.

  @Roles(Role.COACH)
  @Get('summary')
  summary(@CurrentUser() user: RequestUser, @Query() query: RosterQueryDto): Promise<RosterSummaryDto> {
    return this.roster.summary(user.id, query);
  }

  @Roles(Role.COACH)
  @Get('invites')
  listInvites(@CurrentUser() user: RequestUser): Promise<InviteDto[]> {
    return this.invites.listPending(user.id);
  }

  @Roles(Role.COACH)
  @Post('invites')
  createInvite(@CurrentUser() user: RequestUser, @Body() dto: CreateInviteDto): Promise<CreateInviteResponse> {
    return this.invites.create(user.id, dto);
  }

  @Roles(Role.COACH)
  @Delete('invites/:id')
  @HttpCode(204)
  revokeInvite(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.invites.revoke(user.id, id);
  }

  @Roles(Role.COACH)
  @Get(':clientId/overview')
  async getOverview(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Query() query: OverviewQueryDto,
  ): Promise<ClientOverviewDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.overview.get(clientId, query.month);
  }

  @Roles(Role.COACH)
  @Get(':clientId/settings')
  async getSettings(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string): Promise<ClientSettingsDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.settings.get(clientId);
  }

  @Roles(Role.COACH)
  @Put(':clientId/settings')
  async updateSettings(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateClientSettingsDto,
  ): Promise<ClientSettingsDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.settings.update(clientId, dto);
  }

  @Roles(Role.COACH)
  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListClientsQuery): Promise<ClientView[]> {
    return this.clients.list(user.id, query);
  }

  @Roles(Role.COACH)
  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateClientDto,
  ): Promise<{ client: ClientView; temporaryPassword: string }> {
    return this.clients.create(user.id, dto);
  }

  @Get(':clientId')
  async get(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string): Promise<ClientView> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.clients.getProfile(clientId, user.role === Role.COACH);
  }

  @Roles(Role.COACH)
  @Patch(':clientId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientView> {
    return this.clients.update(user.id, clientId, dto);
  }
}
