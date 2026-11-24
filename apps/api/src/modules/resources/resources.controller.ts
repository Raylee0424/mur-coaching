import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { ClientResourceDto, CreateResourceResponse, RedirectUrlDto, ResourceDto, ResourceLibraryDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { CreateResourceDto, ShareResourceDto } from './dto/resources.dto';
import { ResourcesService } from './resources.service';

/** Coach library. Every query is scoped to the signed-in coach. */
@Roles(Role.COACH)
@Controller('coach/resources')
export class CoachResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  library(@CurrentUser() user: RequestUser): Promise<ResourceLibraryDto> {
    return this.resources.library(user.id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateResourceDto): Promise<CreateResourceResponse> {
    return this.resources.create(user.id, dto);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<ResourceDto> {
    return this.resources.complete(user.id, id);
  }

  @Put(':id/shares')
  share(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ShareResourceDto): Promise<ResourceDto> {
    return this.resources.share(user.id, id, dto.clientIds);
  }

  @Get(':id/url')
  url(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<RedirectUrlDto> {
    return this.resources.coachReadUrl(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.resources.remove(user.id, id);
  }
}

@Roles(Role.CLIENT)
@Controller('me/resources')
export class MeResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser): Promise<ClientResourceDto[]> {
    return this.resources.forClient(user.id);
  }

  @Get(':id/url')
  url(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<RedirectUrlDto> {
    return this.resources.clientReadUrl(user.id, id);
  }
}
