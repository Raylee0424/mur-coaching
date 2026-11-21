import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from './client-access.service';
import { ClientView, ClientsService } from './clients.service';
import { CreateClientDto, ListClientsQuery, UpdateClientDto } from './dto/clients.dto';

@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clients: ClientsService,
    private readonly access: ClientAccessService,
  ) {}

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
