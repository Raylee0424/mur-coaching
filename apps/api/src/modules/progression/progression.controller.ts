import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { ProgressionRecommendation } from '@prisma/client';
import { RecommendationStatus, Role } from '@coaching/shared';
import type { BulkResolveResponse, ExplainDto, RecommendationQueueResponse } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { HistoryQuery, OverrideRecommendationDto, UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { BulkResolveDto, QueueQuery } from './dto/queue.dto';
import { ExplainService } from './explain.service';
import { ProgressionService } from './progression.service';
import { QueueService } from './queue.service';

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
    private readonly queue: QueueService,
    private readonly explainer: ExplainService,
  ) {}

  /** Coach-wide queue across the coach's own ACTIVE clients. */
  @Roles(Role.COACH)
  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: QueueQuery): Promise<RecommendationQueueResponse> {
    return this.queue.list(user.id, query);
  }

  /** Accept or dismiss many at once. 404 for the whole batch if any id is not the coach's. */
  @Roles(Role.COACH)
  @Post('bulk')
  @HttpCode(200)
  bulk(@CurrentUser() user: RequestUser, @Body() dto: BulkResolveDto): Promise<BulkResolveResponse> {
    return this.queue.bulkResolve(user.id, dto.ids, dto.status);
  }

  /** "Why this call": rule trace, inputs, settings used and call history. Coach, or the client it belongs to. */
  @Get(':id/explain')
  async explain(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<ExplainDto> {
    const { clientId, dto } = await this.explainer.explain(id);
    await this.access.assertCanAccessClient(user, clientId);
    return dto;
  }

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

  /** Coach replaces the engine's target with their own; the engine's call stays on record. */
  @Roles(Role.COACH)
  @Patch(':id/override')
  async override(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: OverrideRecommendationDto,
  ): Promise<ProgressionRecommendation> {
    if (dto.repsMin > dto.repsMax) throw new BadRequestException('repsMin cannot exceed repsMax');
    const rec = await this.progression.getById(id);
    await this.access.assertCanAccessClient(user, rec.clientId);
    return this.progression.override(id, user.id, dto);
  }
}
