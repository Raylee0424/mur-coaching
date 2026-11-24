import { Body, Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { RoadmapDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { SaveRoadmapDto } from './dto/roadmap.dto';
import { RoadmapsService } from './roadmaps.service';

@Roles(Role.COACH)
@Controller('clients/:clientId/roadmap')
export class CoachRoadmapController {
  constructor(
    private readonly roadmaps: RoadmapsService,
    private readonly access: ClientAccessService,
  ) {}

  @Get()
  async get(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string): Promise<RoadmapDto | null> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.roadmaps.get(clientId);
  }

  @Put()
  async save(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Body() dto: SaveRoadmapDto): Promise<RoadmapDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.roadmaps.save(user.id, clientId, dto);
  }

  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string): Promise<void> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.roadmaps.remove(clientId);
  }
}

@Roles(Role.CLIENT)
@Controller('me/roadmap')
export class MeRoadmapController {
  constructor(private readonly roadmaps: RoadmapsService) {}

  @Get()
  get(@CurrentUser() user: RequestUser): Promise<RoadmapDto | null> {
    return this.roadmaps.get(user.id);
  }
}
