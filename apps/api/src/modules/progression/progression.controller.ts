import { Body, Controller, ForbiddenException, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { ProgressionRecommendation } from '@prisma/client';
import { RecommendationStatus, Role } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { HistoryQuery, UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { ProgressionService } from './progression.service';

@Controller('clients/:clientId/progression')
export class ProgressionController {
  constructor(
    private readonly progression: ProgressionService,
    private readonly access: ClientAccessService,
  ) {}

  @Get()
  async latest(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
  ): Promise<ProgressionRecommendation[]> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.progression.latestPerExercise(clientId);
  }

  @Get(':exerciseId')
  async history(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Param('exerciseId') exerciseId: string,
    @Query() query: HistoryQuery,
  ) {
    await this.access.assertCanAccessClient(user, clientId);
    return this.progression.history(clientId, exerciseId, query.limit ?? 30);
  }

  @Roles(Role.COACH)
  @Post('evaluate')
  @HttpCode(200)
  async evaluateAll(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
  ): Promise<ProgressionRecommendation[]> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.progression.evaluateAll(clientId);
  }

  @Post(':exerciseId/evaluate')
  @HttpCode(200)
  async evaluateOne(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Param('exerciseId') exerciseId: string,
  ): Promise<ProgressionRecommendation> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.progression.evaluateExercise(clientId, exerciseId);
  }
}

@Controller('progression/recommendations')
export class RecommendationsController {
  constructor(
    private readonly progression: ProgressionService,
    private readonly access: ClientAccessService,
  ) {}

  /** Coach: accept or dismiss. Client (self): accept only. */
  @Patch(':id')
  async resolve(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationDto,
  ): Promise<ProgressionRecommendation> {
    const rec = await this.progression.getById(id);
    await this.access.assertCanAccessClient(user, rec.clientId);
    if (user.role === Role.CLIENT && dto.status !== RecommendationStatus.ACCEPTED) {
      throw new ForbiddenException('Clients can only accept recommendations');
    }
    return this.progression.resolve(id, dto.status);
  }
}
