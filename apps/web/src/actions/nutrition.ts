'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type {
  FoodDto,
  LogMealRequest,
  SaveFoodRequest,
  SaveMealPlanRequest,
  SaveMealTemplateRequest,
  SaveNutritionTargetRequest,
} from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { nutritionApi } from '@/lib/api/endpoints';

const CLIENT_PAGES = ['/client', '/client/nutrition', '/client/nutrition/plans'];

async function run<T>(call: () => Promise<T>, paths: string[] = CLIENT_PAGES): Promise<ActionResult<T>> {
  try {
    const data = await call();
    for (const p of paths) revalidatePath(p);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

const coachPage = (clientId: string): string[] => [`/coach/clients/${clientId}/nutrition`];

// ─── Foods (either role; nothing to revalidate on search) ───

export async function searchFoods(q: string): Promise<ActionResult<FoodDto[]>> {
  return run(() => nutritionApi.searchFoods(q.trim() || undefined), []);
}

export async function createFood(input: SaveFoodRequest): Promise<ActionResult<FoodDto>> {
  return run(() => nutritionApi.createFood(input), []);
}

export async function archiveFood(id: string): Promise<ActionResult> {
  return run(() => nutritionApi.archiveFood(id));
}

export async function setFoodFavorite(id: string, on: boolean): Promise<ActionResult> {
  return run(() => nutritionApi.favorite(id, on));
}

// ─── Client ───

export async function logMeal(input: LogMealRequest): Promise<ActionResult> {
  return run(async () => {
    await nutritionApi.log(input);
  });
}

export async function deleteMealEntry(id: string): Promise<ActionResult> {
  return run(() => nutritionApi.removeEntry(id));
}

export async function logWater(date: string, ml: number): Promise<ActionResult> {
  return run(async () => {
    await nutritionApi.logWater({ date, ml });
  });
}

export async function deleteWater(id: string): Promise<ActionResult> {
  return run(() => nutritionApi.removeWater(id));
}

export async function saveOwnTarget(input: SaveNutritionTargetRequest): Promise<ActionResult> {
  return run(async () => {
    await nutritionApi.saveTarget(input);
  });
}

export async function createMealTemplate(input: SaveMealTemplateRequest): Promise<ActionResult> {
  return run(async () => {
    await nutritionApi.createTemplate(input);
  });
}

export async function deleteMealTemplate(id: string): Promise<ActionResult> {
  return run(() => nutritionApi.removeTemplate(id));
}

// ─── Coach ───

export async function saveClientTarget(clientId: string, input: SaveNutritionTargetRequest): Promise<ActionResult> {
  return run(async () => {
    await nutritionApi.saveClientTarget(clientId, input);
  }, coachPage(clientId));
}

export async function clearClientTarget(clientId: string): Promise<ActionResult> {
  return run(() => nutritionApi.clearClientTarget(clientId), coachPage(clientId));
}

export async function saveMealPlan(clientId: string, planId: string | null, input: SaveMealPlanRequest): Promise<ActionResult> {
  return run(async () => {
    await (planId ? nutritionApi.replacePlan(clientId, planId, input) : nutritionApi.createPlan(clientId, input));
  }, coachPage(clientId));
}

export async function deleteMealPlan(clientId: string, planId: string): Promise<ActionResult> {
  return run(() => nutritionApi.removePlan(clientId, planId), coachPage(clientId));
}
