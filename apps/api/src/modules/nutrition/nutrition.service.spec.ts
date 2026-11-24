import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { groceryList, scaleNutrients, summarizeAdherence, totalsToNutrients, windowDates } from '@coaching/shared';
import type { DayIntakeDto, Nutrients } from '@coaching/shared';
import { NutritionService } from './nutrition.service';

const D = (v: number | string) => new Prisma.Decimal(v);
const today = new Date().toISOString().slice(0, 10);

const oats = {
  id: 'usda-oats',
  ownerId: null,
  source: 'USDA',
  name: 'Oats',
  brand: null,
  servingG: D(40),
  servingLabel: '1/2 cup',
  kcal: D(379),
  proteinG: D(13.2),
  carbsG: D(67.7),
  fatG: D(6.5),
  fiberG: D(10.1),
  sodiumMg: null,
  potassiumMg: null,
  calciumMg: null,
  ironMg: D(4.25),
  magnesiumMg: D(138),
  vitaminDMcg: null,
  archivedAt: null,
  createdAt: new Date(),
};

function setup(opts: { coachId?: string | null; target?: { setById: string | null } | null } = {}) {
  const created: unknown[] = [];
  const prisma = {
    coachClient: { findFirst: vi.fn().mockResolvedValue(opts.coachId ? { coachId: opts.coachId } : null) },
    nutritionTarget: {
      findUnique: vi.fn().mockResolvedValue(opts.target ?? null),
      upsert: vi.fn().mockImplementation(({ create }) =>
        Promise.resolve({ ...create, id: 't1', updatedAt: new Date(), setBy: { name: 'Coach', displayName: null } }),
      ),
    },
    food: { findFirst: vi.fn().mockResolvedValue(oats), count: vi.fn().mockResolvedValue(1), create: vi.fn() },
    mealTemplate: { findFirst: vi.fn() },
    mealPlanMeal: { findFirst: vi.fn() },
    mealPlan: { count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    mealEntry: {
      // Echoes the data: numbers and decimal strings both serialize through toString() like Prisma.Decimal.
      create: vi.fn().mockImplementation(({ data }) => {
        const row = { ...data, id: `e${created.length}`, createdAt: new Date() };
        created.push(row);
        return row;
      }),
    },
    $transaction: vi.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
  };
  return { prisma, created, service: new NutritionService(prisma as never) };
}

describe('NutritionService targets', () => {
  it('refuses a client edit while the current coach manages the target', async () => {
    const { service, prisma } = setup({ coachId: 'c1', target: { setById: 'c1' } });
    await expect(service.saveOwnTarget('k1', { kcal: 2400, proteinG: 180, carbsG: 250, fatG: 70 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.nutritionTarget.upsert).not.toHaveBeenCalled();
  });

  it('lets the client edit once that coach link is gone', async () => {
    const { service, prisma } = setup({ coachId: null, target: { setById: 'c1' } });
    const t = await service.saveOwnTarget('k1', { kcal: 2400, proteinG: 180, carbsG: 250, fatG: 70 });
    expect(prisma.nutritionTarget.upsert).toHaveBeenCalled();
    expect(t.setBy).toBe('SELF');
  });

  it('records the coach as setter on a coach save', async () => {
    const { service } = setup({ coachId: 'c1' });
    const t = await service.saveCoachTarget('c1', 'k1', { kcal: 2800, proteinG: 195, carbsG: 340, fatG: 78, waterMl: 3600 });
    expect(t).toMatchObject({ setBy: 'COACH', setByName: 'Coach', waterMl: 3600, fiberG: null });
  });
});

describe('NutritionService.logMeal', () => {
  it('needs exactly one source', async () => {
    const { service } = setup();
    await expect(service.logMeal('k1', { date: today, slot: 'BREAKFAST' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.logMeal('k1', { date: today, slot: 'BREAKFAST', foodId: 'a', templateId: 'b' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses future days and out-of-range grams', async () => {
    const { service } = setup();
    await expect(service.logMeal('k1', { date: '2999-01-01', slot: 'LUNCH', foodId: 'usda-oats', grams: '50' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.logMeal('k1', { date: today, slot: 'LUNCH', foodId: 'usda-oats', grams: '0' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.logMeal('k1', { date: today, slot: 'LUNCH', foodId: 'usda-oats', grams: '6000' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('snapshots scaled nutrients for a food', async () => {
    const { service, prisma } = setup();
    const [entry] = await service.logMeal('k1', { date: today, slot: 'BREAKFAST', foodId: 'usda-oats', grams: '50' });
    expect(prisma.food.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'usda-oats', archivedAt: null });
    expect(entry).toMatchObject({ name: 'Oats', grams: '50', slot: 'BREAKFAST' });
    expect(entry!.nutrients).toMatchObject({ kcal: '189.5', proteinG: '6.6', ironMg: '2.13', sodiumMg: null });
  });

  it('scales a recipe by servings eaten over batch servings', async () => {
    const { service, prisma, created } = setup();
    prisma.mealTemplate.findFirst.mockResolvedValue({ id: 't1', servings: 4, items: [{ food: oats, grams: D(400) }] });
    await service.logMeal('k1', { date: today, slot: 'DINNER', templateId: 't1', servings: '1.5' });
    expect(created).toHaveLength(1);
    expect((created[0] as { grams: number }).grams).toBe(150);
  });

  it('only logs plan meals from the current coach', async () => {
    const none = setup({ coachId: null });
    await expect(none.service.logMeal('k1', { date: today, slot: 'LUNCH', planMealId: 'm1' })).rejects.toBeInstanceOf(NotFoundException);
    expect(none.prisma.mealPlanMeal.findFirst).not.toHaveBeenCalled();

    const linked = setup({ coachId: 'c1' });
    linked.prisma.mealPlanMeal.findFirst.mockResolvedValue({ items: [{ food: oats, grams: D(80) }] });
    await linked.service.logMeal('k1', { date: today, slot: 'LUNCH', planMealId: 'm1' });
    expect(linked.prisma.mealPlanMeal.findFirst.mock.calls[0][0].where).toEqual({ id: 'm1', plan: { clientId: 'k1', coachId: 'c1' } });
  });
});

describe('NutritionService plans', () => {
  it('rejects foods the coach cannot use', async () => {
    const { service, prisma } = setup({ coachId: 'c1' });
    prisma.food.count.mockResolvedValue(0);
    await expect(
      service.createPlan('c1', 'k1', { name: 'Training day', meals: [{ name: 'Meal 1', items: [{ foodId: 'someone-else', grams: '100' }] }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mealPlan.create).not.toHaveBeenCalled();
  });

  it('caps plans per client', async () => {
    const { service, prisma } = setup({ coachId: 'c1' });
    prisma.mealPlan.count.mockResolvedValue(10);
    await expect(service.createPlan('c1', 'k1', { name: 'x', meals: [{ name: 'm', items: [{ foodId: 'usda-oats', grams: '50' }] }] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('NutritionService.createFood', () => {
  it('refuses impossible macros', async () => {
    const { service, prisma } = setup();
    await expect(
      service.createFood('k1', { name: 'Bad', servingG: '100', per100g: { kcal: '400', proteinG: '60', carbsG: '50', fatG: '10' } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.food.create).not.toHaveBeenCalled();
  });
});

const n = (kcal: string, proteinG: string, magnesiumMg: string | null): Nutrients =>
  ({ kcal, proteinG, carbsG: '0', fatG: '0', fiberG: null, sodiumMg: null, potassiumMg: null, calciumMg: null, ironMg: null, magnesiumMg, vitaminDMcg: null }) as Nutrients;

describe('nutrition math', () => {
  it('scales per 100 g and keeps unknown micros null', () => {
    expect(scaleNutrients(n('165', '31', null), 220)).toMatchObject({ kcal: '363', proteinG: '68.2', magnesiumMg: null });
  });

  it('sums totals; a micro stays null only when no item has it', () => {
    const t = totalsToNutrients([n('100', '10', null), n('50.5', '2.25', '30')]);
    expect(t).toMatchObject({ kcal: '150.5', proteinG: '12.3', magnesiumMg: '30', fiberG: null });
  });

  it('builds a weekly grocery list by food', () => {
    expect(
      groceryList([
        { foodId: 'b', name: 'Rice', grams: 150 },
        { foodId: 'a', name: 'Chicken', grams: 200 },
        { foodId: 'b', name: 'Rice', grams: 100 },
      ]),
    ).toEqual([
      { foodId: 'a', name: 'Chicken', weeklyGrams: 1400 },
      { foodId: 'b', name: 'Rice', weeklyGrams: 1750 },
    ]);
  });

  it('lists window dates oldest first', () => {
    expect(windowDates('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });

  it('judges adherence against the calorie band and protein floor', () => {
    const d = (date: string, kcal: number, protein: number, water: number, count = 1): DayIntakeDto => ({
      date, kcal: String(kcal), proteinG: String(protein), carbsG: '0', fatG: '0', waterMl: water, entryCount: count,
    });
    const s = summarizeAdherence(
      [d('2026-01-04', 0, 0, 0, 0), d('2026-01-01', 2000, 150, 3000), d('2026-01-02', 2300, 150, 1000), d('2026-01-03', 2000, 100, 3500)],
      { kcal: 2000, proteinG: 150, waterMl: 3000 },
    );
    expect(s.days.map((x) => x.verdict)).toEqual(['ON_TARGET', 'OVER', 'UNDER', 'NO_LOG']);
    expect(s).toMatchObject({ loggedDays: 3, onTargetDays: 1, hydratedDays: 2, avgKcal: 2100, avgWaterMl: 2500 });
  });

  it('marks logged days LOGGED without a target and uses the default water goal', () => {
    const s = summarizeAdherence([{ date: '2026-01-01', kcal: '1800', proteinG: '90', carbsG: '0', fatG: '0', waterMl: 3000, entryCount: 2 }], null);
    expect(s.days[0]).toMatchObject({ verdict: 'LOGGED', hydrated: true, kcalPct: null });
    expect(s.onTargetDays).toBe(0);
  });
});
