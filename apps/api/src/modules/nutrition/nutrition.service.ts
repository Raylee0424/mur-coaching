import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Food, MealEntry, NutritionTarget, Prisma } from '@prisma/client';
import {
  FOOD_PER_100G_MAX,
  MACRO_KEYS,
  NUTRIENT_KEYS,
  NUTRITION_LIMITS as L,
  divideNutrients,
  groceryList,
  scaleNutrients,
  totalsToNutrients,
  windowDates,
} from '@coaching/shared';
import type {
  CoachNutritionDto,
  DayIntakeDto,
  FoodDto,
  ItemInput,
  LogMealRequest,
  LogWaterRequest,
  MealEntryDto,
  MealPlanDto,
  MealTemplateDto,
  NutrientKey,
  Nutrients,
  NutritionDayDto,
  NutritionLibraryDto,
  NutritionTargetDto,
  SaveFoodRequest,
  SaveMealPlanRequest,
  SaveMealTemplateRequest,
  SaveNutritionTargetRequest,
  TemplateItemDto,
  WaterLogDto,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES } from '../clients/link-status';

const DAY_MS = 86_400_000;
const day = (d: Date): string => d.toISOString().slice(0, 10);
const asDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const today = (): string => day(new Date());

function realDate(iso: string): Date {
  const d = asDate(iso);
  if (Number.isNaN(d.getTime()) || day(d) !== iso) throw new BadRequestException('The date is not a real date.');
  return d;
}

/** Logging dates may not be after tomorrow (UTC; covers clients east of UTC). */
function loggableDate(iso: string): Date {
  const d = realDate(iso);
  if (d.getTime() > Date.now() + DAY_MS) throw new BadRequestException('You cannot log food or water for a future day.');
  return d;
}

function grams(value: string, label = 'Grams'): number {
  const n = Number(value);
  if (!(n > 0) || n > L.maxGrams) throw new BadRequestException(`${label} must be more than 0 and at most ${L.maxGrams} g.`);
  return Math.round(n * 10) / 10;
}

type NutrientRow = Pick<Food, NutrientKey>;

function nutrientsOf(row: NutrientRow): Nutrients {
  const out = {} as Record<NutrientKey, string | null>;
  for (const k of NUTRIENT_KEYS) out[k] = row[k] === null ? null : row[k]!.toString();
  return out as Nutrients;
}

const PLAN_INCLUDE = {
  coach: { select: { name: true, displayName: true } },
  meals: { orderBy: { position: 'asc' }, include: { items: { orderBy: { position: 'asc' }, include: { food: true } } } },
} satisfies Prisma.MealPlanInclude;
type PlanRow = Prisma.MealPlanGetPayload<{ include: typeof PLAN_INCLUDE }>;

const TEMPLATE_INCLUDE = { items: { orderBy: { position: 'asc' }, include: { food: true } } } satisfies Prisma.MealTemplateInclude;
type TemplateRow = Prisma.MealTemplateGetPayload<{ include: typeof TEMPLATE_INCLUDE }>;

type TargetRow = NutritionTarget & { setBy: { name: string; displayName: string | null } | null };

@Injectable()
export class NutritionService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Shared helpers ───

  /** Foods a user may pick for new logs, templates or plans: the global catalog plus their own, not archived. */
  private usable(userId: string): Prisma.FoodWhereInput {
    return { archivedAt: null, OR: [{ ownerId: null }, { ownerId: userId }] };
  }

  private async currentCoachId(clientId: string): Promise<string | null> {
    const link = await this.prisma.coachClient.findFirst({
      where: { clientId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } },
      select: { coachId: true },
    });
    return link?.coachId ?? null;
  }

  private toFood(f: Food, userId: string, favorites: Set<string>): FoodDto {
    return {
      id: f.id,
      name: f.name,
      brand: f.brand,
      source: f.source,
      servingG: f.servingG.toString(),
      servingLabel: f.servingLabel,
      per100g: nutrientsOf(f),
      mine: f.ownerId === userId,
      favorite: favorites.has(f.id),
    };
  }

  private toEntry(e: MealEntry): MealEntryDto {
    return {
      id: e.id,
      date: day(e.date),
      slot: e.slot,
      foodId: e.foodId,
      name: e.name,
      source: e.source,
      grams: e.grams.toString(),
      nutrients: nutrientsOf(e),
      createdAt: e.createdAt.toISOString(),
    };
  }

  private toTarget(t: TargetRow | null, clientId: string): NutritionTargetDto | null {
    if (!t) return null;
    const byCoach = t.setById !== null && t.setById !== clientId;
    return {
      kcal: t.kcal,
      proteinG: t.proteinG,
      carbsG: t.carbsG,
      fatG: t.fatG,
      fiberG: t.fiberG,
      waterMl: t.waterMl,
      setBy: byCoach ? 'COACH' : 'SELF',
      setByName: byCoach && t.setBy ? (t.setBy.displayName ?? t.setBy.name) : null,
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private target(clientId: string): Promise<TargetRow | null> {
    return this.prisma.nutritionTarget.findUnique({ where: { clientId }, include: { setBy: { select: { name: true, displayName: true } } } });
  }

  private itemsOf(items: { food: Food; grams: Prisma.Decimal }[]): { list: TemplateItemDto[]; nutrients: Nutrients[] } {
    return {
      list: items.map((i) => ({ foodId: i.food.id, name: i.food.name, grams: i.grams.toString() })),
      nutrients: items.map((i) => scaleNutrients(nutrientsOf(i.food), Number(i.grams))),
    };
  }

  private toTemplate(t: TemplateRow): MealTemplateDto {
    const { list, nutrients } = this.itemsOf(t.items);
    return { id: t.id, name: t.name, servings: t.servings, items: list, perServing: divideNutrients(totalsToNutrients(nutrients), t.servings) };
  }

  private toPlan(p: PlanRow): MealPlanDto {
    const meals = p.meals.map((m) => {
      const { list, nutrients } = this.itemsOf(m.items);
      return { id: m.id, name: m.name, items: list, totals: totalsToNutrients(nutrients) };
    });
    const allItems = p.meals.flatMap((m) => m.items);
    return {
      id: p.id,
      name: p.name,
      notes: p.notes,
      coachName: p.coach.displayName ?? p.coach.name,
      meals,
      totals: totalsToNutrients(meals.map((m) => m.totals)),
      grocery: groceryList(allItems.map((i) => ({ foodId: i.food.id, name: i.food.name, grams: Number(i.grams) }))).map((g) => ({
        foodId: g.foodId,
        name: g.name,
        weeklyGrams: String(g.weeklyGrams),
      })),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  /** Every food id must be usable by `userId`; returns validated grams per item. */
  private async checkItems(userId: string, items: ItemInput[]): Promise<{ foodId: string; grams: number }[]> {
    const parsed = items.map((i) => ({ foodId: i.foodId, grams: grams(i.grams) }));
    const ids = [...new Set(parsed.map((i) => i.foodId))];
    const found = await this.prisma.food.count({ where: { id: { in: ids }, ...this.usable(userId) } });
    if (found !== ids.length) throw new BadRequestException('One or more foods are not in your food list.');
    return parsed;
  }

  // ─── Foods (any role) ───

  async searchFoods(userId: string, q: string | undefined): Promise<FoodDto[]> {
    const term = q?.trim();
    const [foods, favs] = await Promise.all([
      this.prisma.food.findMany({
        where: { ...this.usable(userId), ...(term ? { name: { contains: term, mode: 'insensitive' } } : {}) },
        orderBy: [{ ownerId: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
        take: L.maxSearchResults,
      }),
      this.favoriteIds(userId),
    ]);
    return foods.map((f) => this.toFood(f, userId, favs));
  }

  private async favoriteIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.foodFavorite.findMany({ where: { userId }, select: { foodId: true } });
    return new Set(rows.map((r) => r.foodId));
  }

  async createFood(userId: string, input: SaveFoodRequest): Promise<FoodDto> {
    const data: Record<NutrientKey, string | null> = {} as Record<NutrientKey, string | null>;
    for (const k of NUTRIENT_KEYS) {
      const raw = input.per100g[k];
      if (raw === undefined || raw === null || raw === '') {
        if ((MACRO_KEYS as readonly string[]).includes(k)) throw new BadRequestException(`${k} is required.`);
        data[k] = null;
        continue;
      }
      if (Number(raw) > FOOD_PER_100G_MAX[k]) throw new BadRequestException(`${k} per 100 g must be at most ${FOOD_PER_100G_MAX[k]}.`);
      data[k] = raw;
    }
    if (Number(data.proteinG) + Number(data.carbsG) + Number(data.fatG) > 100.5) {
      throw new BadRequestException('Protein, carbs and fat together cannot exceed 100 g per 100 g.');
    }
    const { kcal, proteinG, carbsG, fatG, ...micros } = data;
    const food = await this.prisma.food.create({
      data: {
        ownerId: userId,
        name: input.name,
        brand: input.brand || null,
        servingG: grams(input.servingG, 'Serving size'),
        servingLabel: input.servingLabel || null,
        kcal: kcal!,
        proteinG: proteinG!,
        carbsG: carbsG!,
        fatG: fatG!,
        ...micros,
      },
    });
    return this.toFood(food, userId, new Set());
  }

  /** Own foods only. Archived, not deleted: logs keep their snapshot and templates or plans keep working. */
  async archiveFood(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.food.updateMany({ where: { id, ownerId: userId, archivedAt: null }, data: { archivedAt: new Date() } });
    if (!count) throw new NotFoundException('Food not found');
  }

  async setFavorite(userId: string, foodId: string, on: boolean): Promise<void> {
    if (!on) {
      await this.prisma.foodFavorite.deleteMany({ where: { userId, foodId } });
      return;
    }
    const food = await this.prisma.food.findFirst({ where: { id: foodId, ...this.usable(userId) }, select: { id: true } });
    if (!food) throw new NotFoundException('Food not found');
    await this.prisma.foodFavorite.upsert({ where: { userId_foodId: { userId, foodId } }, create: { userId, foodId }, update: {} });
  }

  // ─── Client day ───

  async day(clientId: string, date: string | undefined): Promise<NutritionDayDto> {
    const iso = date ?? today();
    const at = realDate(iso);
    const [target, coachId, entries, water] = await Promise.all([
      this.target(clientId),
      this.currentCoachId(clientId),
      this.prisma.mealEntry.findMany({ where: { clientId, date: at }, orderBy: { createdAt: 'asc' } }),
      this.prisma.waterLog.findMany({ where: { clientId, date: at }, orderBy: { createdAt: 'asc' } }),
    ]);
    return {
      date: iso,
      target: this.toTarget(target, clientId),
      canEditTarget: !(target?.setById && target.setById === coachId),
      entries: entries.map((e) => this.toEntry(e)),
      water: water.map((w): WaterLogDto => ({ id: w.id, ml: w.ml, createdAt: w.createdAt.toISOString() })),
    };
  }

  /** Refused while the client's current coach manages the target. */
  async saveOwnTarget(clientId: string, input: SaveNutritionTargetRequest): Promise<NutritionTargetDto> {
    const [existing, coachId] = await Promise.all([
      this.prisma.nutritionTarget.findUnique({ where: { clientId }, select: { setById: true } }),
      this.currentCoachId(clientId),
    ]);
    if (existing?.setById && existing.setById === coachId) throw new ForbiddenException('Your coach manages your nutrition targets.');
    return this.writeTarget(clientId, clientId, input);
  }

  private async writeTarget(clientId: string, setById: string, input: SaveNutritionTargetRequest): Promise<NutritionTargetDto> {
    const data = {
      kcal: input.kcal,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      fiberG: input.fiberG ?? null,
      waterMl: input.waterMl ?? null,
      setById,
    };
    const row = await this.prisma.nutritionTarget.upsert({
      where: { clientId },
      create: { clientId, ...data },
      update: data,
      include: { setBy: { select: { name: true, displayName: true } } },
    });
    return this.toTarget(row, clientId)!;
  }

  /** Exactly one source per call; each resulting entry snapshots name and nutrients. */
  async logMeal(clientId: string, input: LogMealRequest): Promise<MealEntryDto[]> {
    const date = loggableDate(input.date);
    const sources = [input.foodId, input.templateId, input.planMealId].filter((s) => s !== undefined && s !== '').length;
    if (sources !== 1) throw new BadRequestException('Log exactly one food, template or plan meal.');

    let portions: { food: Food; grams: number }[];
    if (input.foodId) {
      if (input.grams === undefined) throw new BadRequestException('Grams are required when logging a food.');
      const food = await this.prisma.food.findFirst({ where: { id: input.foodId, ...this.usable(clientId) } });
      if (!food) throw new NotFoundException('Food not found');
      portions = [{ food, grams: grams(input.grams) }];
    } else if (input.templateId) {
      const template = await this.prisma.mealTemplate.findFirst({ where: { id: input.templateId, ownerId: clientId }, include: TEMPLATE_INCLUDE });
      if (!template) throw new NotFoundException('Template not found');
      const servings = input.servings === undefined ? 1 : Number(input.servings);
      if (!(servings > 0) || servings > L.maxTemplateServings) throw new BadRequestException(`Servings must be more than 0 and at most ${L.maxTemplateServings}.`);
      portions = template.items.map((i) => ({ food: i.food, grams: Math.round(((Number(i.grams) * servings) / template.servings) * 10) / 10 }));
    } else {
      const coachId = await this.currentCoachId(clientId);
      const meal = coachId
        ? await this.prisma.mealPlanMeal.findFirst({
            where: { id: input.planMealId, plan: { clientId, coachId } },
            include: { items: { orderBy: { position: 'asc' }, include: { food: true } } },
          })
        : null;
      if (!meal) throw new NotFoundException('Plan meal not found');
      portions = meal.items.map((i) => ({ food: i.food, grams: Number(i.grams) }));
    }
    portions = portions.filter((p) => p.grams >= 0.1);
    if (!portions.length) throw new BadRequestException('Nothing to log.');

    const rows = await this.prisma.$transaction(
      portions.map((p) =>
        this.prisma.mealEntry.create({
          data: {
            clientId,
            date,
            slot: input.slot,
            foodId: p.food.id,
            name: p.food.name,
            source: p.food.source,
            grams: p.grams,
            ...scaleNutrients(nutrientsOf(p.food), p.grams),
          },
        }),
      ),
    );
    return rows.map((r) => this.toEntry(r));
  }

  async deleteEntry(clientId: string, id: string): Promise<void> {
    const { count } = await this.prisma.mealEntry.deleteMany({ where: { id, clientId } });
    if (!count) throw new NotFoundException('Entry not found');
  }

  async logWater(clientId: string, input: LogWaterRequest): Promise<WaterLogDto> {
    const row = await this.prisma.waterLog.create({ data: { clientId, date: loggableDate(input.date), ml: input.ml } });
    return { id: row.id, ml: row.ml, createdAt: row.createdAt.toISOString() };
  }

  async deleteWater(clientId: string, id: string): Promise<void> {
    const { count } = await this.prisma.waterLog.deleteMany({ where: { id, clientId } });
    if (!count) throw new NotFoundException('Water entry not found');
  }

  // ─── Client library ───

  async library(clientId: string): Promise<NutritionLibraryDto> {
    const coachId = await this.currentCoachId(clientId);
    const [templates, favorites, plans] = await Promise.all([
      this.prisma.mealTemplate.findMany({ where: { ownerId: clientId }, include: TEMPLATE_INCLUDE, orderBy: { name: 'asc' } }),
      this.prisma.foodFavorite.findMany({ where: { userId: clientId, food: { archivedAt: null } }, include: { food: true }, orderBy: { createdAt: 'desc' } }),
      coachId ? this.prisma.mealPlan.findMany({ where: { clientId, coachId }, include: PLAN_INCLUDE, orderBy: { updatedAt: 'desc' } }) : Promise.resolve([]),
    ]);
    const favIds = new Set(favorites.map((f) => f.foodId));
    return {
      templates: templates.map((t) => this.toTemplate(t)),
      favorites: favorites.map((f) => this.toFood(f.food, clientId, favIds)),
      plans: plans.map((p) => this.toPlan(p)),
    };
  }

  async createTemplate(ownerId: string, input: SaveMealTemplateRequest): Promise<MealTemplateDto> {
    const items = await this.checkItems(ownerId, input.items);
    const row = await this.prisma.mealTemplate.create({
      data: { ownerId, name: input.name, servings: input.servings, items: { create: items.map((i, position) => ({ ...i, position })) } },
      include: TEMPLATE_INCLUDE,
    });
    return this.toTemplate(row);
  }

  async deleteTemplate(ownerId: string, id: string): Promise<void> {
    const { count } = await this.prisma.mealTemplate.deleteMany({ where: { id, ownerId } });
    if (!count) throw new NotFoundException('Template not found');
  }

  // ─── Coach oversight (caller enforces CoachClient tenancy) ───

  async coachOverview(coachId: string, clientId: string): Promise<CoachNutritionDto> {
    const end = today();
    const dates = windowDates(end, L.windowDays);
    const range = { gte: asDate(dates[0]!), lte: asDate(end) };
    const [client, target, meals, water, todayEntries, plans] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: clientId }, select: { name: true, displayName: true } }),
      this.target(clientId),
      this.prisma.mealEntry.groupBy({
        by: ['date'],
        where: { clientId, date: range },
        _sum: { kcal: true, proteinG: true, carbsG: true, fatG: true },
        _count: { _all: true },
      }),
      this.prisma.waterLog.groupBy({ by: ['date'], where: { clientId, date: range }, _sum: { ml: true } }),
      this.prisma.mealEntry.findMany({ where: { clientId, date: asDate(end) }, orderBy: { createdAt: 'asc' } }),
      this.prisma.mealPlan.findMany({ where: { clientId, coachId }, include: PLAN_INCLUDE, orderBy: { updatedAt: 'desc' } }),
    ]);
    const mealsByDay = new Map(meals.map((m) => [day(m.date), m]));
    const waterByDay = new Map(water.map((w) => [day(w.date), w._sum.ml ?? 0]));
    const days: DayIntakeDto[] = dates.map((d) => {
      const m = mealsByDay.get(d);
      return {
        date: d,
        kcal: m?._sum.kcal?.toString() ?? '0',
        proteinG: m?._sum.proteinG?.toString() ?? '0',
        carbsG: m?._sum.carbsG?.toString() ?? '0',
        fatG: m?._sum.fatG?.toString() ?? '0',
        waterMl: waterByDay.get(d) ?? 0,
        entryCount: m?._count._all ?? 0,
      };
    });
    return {
      clientName: client.displayName ?? client.name,
      today: end,
      target: this.toTarget(target, clientId),
      days,
      todayEntries: todayEntries.map((e) => this.toEntry(e)),
      plans: plans.map((p) => this.toPlan(p)),
    };
  }

  /** The coach takes over the target; the client cannot edit it while this coach link is accessible. */
  saveCoachTarget(coachId: string, clientId: string, input: SaveNutritionTargetRequest): Promise<NutritionTargetDto> {
    return this.writeTarget(clientId, coachId, input);
  }

  /** Hands targets back to the client by removing them. */
  async clearTarget(clientId: string): Promise<void> {
    await this.prisma.nutritionTarget.deleteMany({ where: { clientId } });
  }

  private async planMeals(coachId: string, input: SaveMealPlanRequest) {
    const checked = await this.checkItems(coachId, input.meals.flatMap((m) => m.items));
    let cursor = 0;
    return input.meals.map((m, position) => ({
      position,
      name: m.name,
      items: { create: m.items.map((_, itemPosition) => ({ ...checked[cursor++]!, position: itemPosition })) },
    }));
  }

  async createPlan(coachId: string, clientId: string, input: SaveMealPlanRequest): Promise<MealPlanDto> {
    const count = await this.prisma.mealPlan.count({ where: { coachId, clientId } });
    if (count >= L.maxPlansPerClient) throw new BadRequestException(`A client can have at most ${L.maxPlansPerClient} meal plans.`);
    const meals = await this.planMeals(coachId, input);
    const row = await this.prisma.mealPlan.create({
      data: { coachId, clientId, name: input.name, notes: input.notes || null, meals: { create: meals } },
      include: PLAN_INCLUDE,
    });
    return this.toPlan(row);
  }

  /** Replaces the whole plan (meals and items) in one transaction. */
  async replacePlan(coachId: string, clientId: string, planId: string, input: SaveMealPlanRequest): Promise<MealPlanDto> {
    const existing = await this.prisma.mealPlan.findFirst({ where: { id: planId, coachId, clientId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Meal plan not found');
    const meals = await this.planMeals(coachId, input);
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.mealPlanMeal.deleteMany({ where: { planId } });
      return tx.mealPlan.update({
        where: { id: planId },
        data: { name: input.name, notes: input.notes || null, meals: { create: meals } },
        include: PLAN_INCLUDE,
      });
    });
    return this.toPlan(row);
  }

  async deletePlan(coachId: string, clientId: string, planId: string): Promise<void> {
    const { count } = await this.prisma.mealPlan.deleteMany({ where: { id: planId, coachId, clientId } });
    if (!count) throw new NotFoundException('Meal plan not found');
  }
}
