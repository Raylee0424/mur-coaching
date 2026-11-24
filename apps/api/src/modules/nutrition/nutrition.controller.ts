import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type {
  CoachNutritionDto,
  FoodDto,
  MealEntryDto,
  MealPlanDto,
  MealTemplateDto,
  NutritionDayDto,
  NutritionLibraryDto,
  NutritionTargetDto,
  WaterLogDto,
} from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import {
  DayQuery,
  LogMealDto,
  LogWaterDto,
  SaveFoodDto,
  SaveMealPlanDto,
  SaveMealTemplateDto,
  SaveNutritionTargetDto,
  SearchFoodsQuery,
} from './nutrition.dto';
import { NutritionService } from './nutrition.service';

/** Food catalog: global rows plus the caller's own custom foods. */
@Roles(Role.CLIENT, Role.COACH)
@Controller('foods')
export class FoodsController {
  constructor(private readonly nutrition: NutritionService) {}

  @Get()
  search(@CurrentUser() user: RequestUser, @Query() query: SearchFoodsQuery): Promise<FoodDto[]> {
    return this.nutrition.searchFoods(user.id, query.q);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: SaveFoodDto): Promise<FoodDto> {
    return this.nutrition.createFood(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  archive(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.nutrition.archiveFood(user.id, id);
  }

  @Put(':id/favorite')
  @HttpCode(204)
  favorite(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.nutrition.setFavorite(user.id, id, true);
  }

  @Delete(':id/favorite')
  @HttpCode(204)
  unfavorite(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.nutrition.setFavorite(user.id, id, false);
  }
}

/** Owner-only routes: every query is scoped to the signed-in client. */
@Roles(Role.CLIENT)
@Controller('me')
export class MeNutritionController {
  constructor(private readonly nutrition: NutritionService) {}

  @Get('nutrition')
  day(@CurrentUser() user: RequestUser, @Query() query: DayQuery): Promise<NutritionDayDto> {
    return this.nutrition.day(user.id, query.date);
  }

  @Put('nutrition/target')
  saveTarget(@CurrentUser() user: RequestUser, @Body() dto: SaveNutritionTargetDto): Promise<NutritionTargetDto> {
    return this.nutrition.saveOwnTarget(user.id, dto);
  }

  @Post('nutrition/entries')
  log(@CurrentUser() user: RequestUser, @Body() dto: LogMealDto): Promise<MealEntryDto[]> {
    return this.nutrition.logMeal(user.id, dto);
  }

  @Delete('nutrition/entries/:id')
  @HttpCode(204)
  removeEntry(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.nutrition.deleteEntry(user.id, id);
  }

  @Post('nutrition/water')
  logWater(@CurrentUser() user: RequestUser, @Body() dto: LogWaterDto): Promise<WaterLogDto> {
    return this.nutrition.logWater(user.id, dto);
  }

  @Delete('nutrition/water/:id')
  @HttpCode(204)
  removeWater(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.nutrition.deleteWater(user.id, id);
  }

  @Get('nutrition/library')
  library(@CurrentUser() user: RequestUser): Promise<NutritionLibraryDto> {
    return this.nutrition.library(user.id);
  }

  @Post('meal-templates')
  createTemplate(@CurrentUser() user: RequestUser, @Body() dto: SaveMealTemplateDto): Promise<MealTemplateDto> {
    return this.nutrition.createTemplate(user.id, dto);
  }

  @Delete('meal-templates/:id')
  @HttpCode(204)
  removeTemplate(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.nutrition.deleteTemplate(user.id, id);
  }
}

/** Coach oversight. Every route passes CoachClient tenancy first (404 across tenants). */
@Roles(Role.COACH)
@Controller('clients/:clientId')
export class CoachNutritionController {
  constructor(
    private readonly nutrition: NutritionService,
    private readonly access: ClientAccessService,
  ) {}

  @Get('nutrition')
  async overview(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string): Promise<CoachNutritionDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.nutrition.coachOverview(user.id, clientId);
  }

  @Put('nutrition/target')
  async saveTarget(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Body() dto: SaveNutritionTargetDto): Promise<NutritionTargetDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.nutrition.saveCoachTarget(user.id, clientId, dto);
  }

  @Delete('nutrition/target')
  @HttpCode(204)
  async clearTarget(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string): Promise<void> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.nutrition.clearTarget(clientId);
  }

  @Post('meal-plans')
  async createPlan(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Body() dto: SaveMealPlanDto): Promise<MealPlanDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.nutrition.createPlan(user.id, clientId, dto);
  }

  @Put('meal-plans/:planId')
  async replacePlan(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Param('planId') planId: string,
    @Body() dto: SaveMealPlanDto,
  ): Promise<MealPlanDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.nutrition.replacePlan(user.id, clientId, planId, dto);
  }

  @Delete('meal-plans/:planId')
  @HttpCode(204)
  async deletePlan(@CurrentUser() user: RequestUser, @Param('clientId') clientId: string, @Param('planId') planId: string): Promise<void> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.nutrition.deletePlan(user.id, clientId, planId);
  }
}
