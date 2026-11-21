import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { ClientSettingsDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from './client-access.service';
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
  ) {}

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
