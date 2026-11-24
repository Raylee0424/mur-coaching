import type { DecimalString, IsoDateString } from './common';

export const FoodSource = { CUSTOM: 'CUSTOM', USDA: 'USDA', CNF: 'CNF' } as const;
export type FoodSource = (typeof FoodSource)[keyof typeof FoodSource];
export const FOOD_SOURCE_LABELS: Record<FoodSource, string> = { CUSTOM: 'Custom', USDA: 'USDA', CNF: 'CNF' };

export const MealSlot = { BREAKFAST: 'BREAKFAST', LUNCH: 'LUNCH', DINNER: 'DINNER', SNACK: 'SNACK' } as const;
export type MealSlot = (typeof MealSlot)[keyof typeof MealSlot];
export const MEAL_SLOTS: readonly MealSlot[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
export const MEAL_SLOT_LABELS: Record<MealSlot, string> = { BREAKFAST: 'Breakfast', LUNCH: 'Lunch', DINNER: 'Dinner', SNACK: 'Snack' };

/** Column names on Food (per 100 g) and MealEntry (per logged portion). */
export const MACRO_KEYS = ['kcal', 'proteinG', 'carbsG', 'fatG'] as const;
export const MICRO_KEYS = ['fiberG', 'sodiumMg', 'potassiumMg', 'calciumMg', 'ironMg', 'magnesiumMg', 'vitaminDMcg'] as const;
export const NUTRIENT_KEYS = [...MACRO_KEYS, ...MICRO_KEYS] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];
export type MicroKey = (typeof MICRO_KEYS)[number];
export type NutrientKey = MacroKey | MicroKey;

/** Macros are always known; a micronutrient is null when the food source has no value for it. */
export type Nutrients = Record<MacroKey, DecimalString> & Record<MicroKey, DecimalString | null>;
/** Same shape as numbers, for math and display. */
export type NutrientTotals = Record<NutrientKey, number>;

export const NUTRIENT_META: Record<NutrientKey, { label: string; unit: string }> = {
  kcal: { label: 'Calories', unit: 'kcal' },
  proteinG: { label: 'Protein', unit: 'g' },
  carbsG: { label: 'Carbs', unit: 'g' },
  fatG: { label: 'Fat', unit: 'g' },
  fiberG: { label: 'Fiber', unit: 'g' },
  sodiumMg: { label: 'Sodium', unit: 'mg' },
  potassiumMg: { label: 'Potassium', unit: 'mg' },
  calciumMg: { label: 'Calcium', unit: 'mg' },
  ironMg: { label: 'Iron', unit: 'mg' },
  magnesiumMg: { label: 'Magnesium', unit: 'mg' },
  vitaminDMcg: { label: 'Vitamin D', unit: 'mcg' },
};

/** FDA adult Daily Values, used for % DV. Sodium is a ceiling, not a goal. */
export const DAILY_VALUES: Record<MicroKey, number> = {
  fiberG: 28,
  sodiumMg: 2300,
  potassiumMg: 4700,
  calciumMg: 1300,
  ironMg: 18,
  magnesiumMg: 420,
  vitaminDMcg: 20,
};

export const NUTRITION_LIMITS = {
  /** Safe calorie floor: targets below this are refused. */
  minKcal: 1000,
  maxKcal: 8000,
  maxProteinG: 500,
  maxCarbsG: 1000,
  maxFatG: 400,
  maxFiberG: 150,
  minWaterMl: 500,
  maxWaterMl: 10000,
  /** One logged portion or plan item. */
  maxGrams: 5000,
  /** One water entry. */
  maxWaterEntryMl: 5000,
  maxTemplateItems: 20,
  maxTemplateServings: 20,
  maxPlanMeals: 8,
  maxPlanItemsPerMeal: 20,
  maxPlansPerClient: 10,
  maxSearchResults: 25,
  /** Days the coach oversight tab and the adherence summary read. */
  windowDays: 7,
  /** Used for the hydration check when no water target is set. */
  defaultWaterMl: 3000,
} as const;

/** Per-100 g bounds a food must satisfy. */
export const FOOD_PER_100G_MAX: Record<NutrientKey, number> = {
  kcal: 900,
  proteinG: 100,
  carbsG: 100,
  fatG: 100,
  fiberG: 100,
  sodiumMg: 40000,
  potassiumMg: 20000,
  calciumMg: 10000,
  ironMg: 100,
  magnesiumMg: 5000,
  vitaminDMcg: 500,
};

// ─── Wire types ───

export interface FoodDto {
  id: string;
  name: string;
  brand: string | null;
  source: FoodSource;
  /** Default portion for one-tap logging. */
  servingG: DecimalString;
  servingLabel: string | null;
  per100g: Nutrients;
  /** The caller's own custom food (deletable). */
  mine: boolean;
  favorite: boolean;
}

export interface SaveFoodRequest {
  name: string;
  brand?: string | null;
  servingG: DecimalString;
  servingLabel?: string | null;
  per100g: Partial<Record<NutrientKey, DecimalString | null>> & Record<MacroKey, DecimalString>;
}

export interface MealEntryDto {
  id: string;
  date: string;
  slot: MealSlot;
  foodId: string | null;
  name: string;
  source: FoodSource;
  grams: DecimalString;
  nutrients: Nutrients;
  createdAt: IsoDateString;
}

/**
 * Exactly one source: a food and grams, a saved template and servings, or a coach plan meal.
 * Every resulting entry snapshots its name and nutrients at log time.
 */
export interface LogMealRequest {
  date: string;
  slot: MealSlot;
  foodId?: string;
  grams?: DecimalString;
  templateId?: string;
  servings?: DecimalString;
  planMealId?: string;
}

export interface WaterLogDto {
  id: string;
  ml: number;
  createdAt: IsoDateString;
}

export interface LogWaterRequest {
  date: string;
  ml: number;
}

export interface NutritionTargetDto {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  waterMl: number | null;
  /** COACH when the client's current coach set it. */
  setBy: 'COACH' | 'SELF';
  setByName: string | null;
  updatedAt: IsoDateString;
}

export interface SaveNutritionTargetRequest {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  waterMl?: number | null;
}

export interface NutritionDayDto {
  date: string;
  target: NutritionTargetDto | null;
  /** The client may edit targets (false while the current coach manages them). */
  canEditTarget: boolean;
  entries: MealEntryDto[];
  water: WaterLogDto[];
}

export interface TemplateItemDto {
  foodId: string;
  name: string;
  grams: DecimalString;
}

export interface MealTemplateDto {
  id: string;
  name: string;
  servings: number;
  items: TemplateItemDto[];
  /** Whole batch divided by servings. */
  perServing: Nutrients;
}

export interface ItemInput {
  foodId: string;
  grams: DecimalString;
}

export interface SaveMealTemplateRequest {
  name: string;
  servings: number;
  items: ItemInput[];
}

export interface MealPlanMealDto {
  id: string;
  name: string;
  items: TemplateItemDto[];
  totals: Nutrients;
}

export interface GroceryItemDto {
  foodId: string;
  name: string;
  /** Daily plan quantity times 7. */
  weeklyGrams: DecimalString;
}

export interface MealPlanDto {
  id: string;
  name: string;
  notes: string | null;
  coachName: string;
  meals: MealPlanMealDto[];
  totals: Nutrients;
  grocery: GroceryItemDto[];
  updatedAt: IsoDateString;
}

export interface SaveMealPlanRequest {
  name: string;
  notes?: string | null;
  meals: { name: string; items: ItemInput[] }[];
}

export interface NutritionLibraryDto {
  templates: MealTemplateDto[];
  favorites: FoodDto[];
  plans: MealPlanDto[];
}

/** One day of intake, summed. */
export interface DayIntakeDto {
  date: string;
  kcal: DecimalString;
  proteinG: DecimalString;
  carbsG: DecimalString;
  fatG: DecimalString;
  waterMl: number;
  entryCount: number;
}

/** Coach oversight tab. `days` is the window ending `today`, oldest first, one row per day. */
export interface CoachNutritionDto {
  clientName: string;
  today: string;
  target: NutritionTargetDto | null;
  days: DayIntakeDto[];
  todayEntries: MealEntryDto[];
  plans: MealPlanDto[];
}

// ─── Pure math ───

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

export function emptyTotals(): NutrientTotals {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as NutrientTotals;
}

/** Nutrients for `grams` of a food given per 100 g. Unknown micros stay null. */
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const out = {} as Record<NutrientKey, DecimalString | null>;
  for (const k of NUTRIENT_KEYS) {
    const v = per100g[k];
    out[k] = v === null ? null : String(k === 'ironMg' || k === 'vitaminDMcg' ? round2((Number(v) * grams) / 100) : round1((Number(v) * grams) / 100));
  }
  return out as Nutrients;
}

/** Sum as numbers; a null micro counts as 0. */
export function sumNutrients(items: Nutrients[]): NutrientTotals {
  const t = emptyTotals();
  for (const n of items) for (const k of NUTRIENT_KEYS) t[k] += Number(n[k] ?? 0);
  for (const k of NUTRIENT_KEYS) t[k] = k === 'ironMg' || k === 'vitaminDMcg' ? round2(t[k]) : round1(t[k]);
  return t;
}

/** Totals back to the wire shape. A micro is null only when every input lacked it. */
export function totalsToNutrients(items: Nutrients[]): Nutrients {
  const t = sumNutrients(items);
  const out = {} as Record<NutrientKey, DecimalString | null>;
  for (const k of NUTRIENT_KEYS) {
    const known = (MACRO_KEYS as readonly string[]).includes(k) || items.some((n) => n[k] !== null);
    out[k] = known ? String(t[k]) : null;
  }
  return out as Nutrients;
}

/** Divide a whole batch into one serving. */
export function divideNutrients(n: Nutrients, by: number): Nutrients {
  const out = {} as Record<NutrientKey, DecimalString | null>;
  for (const k of NUTRIENT_KEYS) {
    const v = n[k];
    out[k] = v === null ? null : String(k === 'ironMg' || k === 'vitaminDMcg' ? round2(Number(v) / by) : round1(Number(v) / by));
  }
  return out as Nutrients;
}

/** Share of a target as a whole percent; null when there is no positive target. */
export function shareOf(value: number, target: number | null | undefined): number | null {
  if (!target || target <= 0) return null;
  return Math.round((value / target) * 100);
}

/** Weekly grocery list: every plan item summed by food, times 7, sorted by name. */
export function groceryList(items: { foodId: string; name: string; grams: number }[]): { foodId: string; name: string; weeklyGrams: number }[] {
  const byFood = new Map<string, { foodId: string; name: string; weeklyGrams: number }>();
  for (const i of items) {
    const row = byFood.get(i.foodId) ?? { foodId: i.foodId, name: i.name, weeklyGrams: 0 };
    row.weeklyGrams += i.grams * 7;
    byFood.set(i.foodId, row);
  }
  return [...byFood.values()].map((r) => ({ ...r, weeklyGrams: round1(r.weeklyGrams) })).sort((a, b) => a.name.localeCompare(b.name));
}

/** LOGGED: food was logged but there is no calorie target to judge it against. */
export type DayVerdict = 'NO_LOG' | 'LOGGED' | 'ON_TARGET' | 'UNDER' | 'OVER';

export interface AdherenceDay {
  date: string;
  kcal: number;
  proteinG: number;
  waterMl: number;
  logged: boolean;
  kcalPct: number | null;
  proteinPct: number | null;
  waterPct: number | null;
  verdict: DayVerdict;
  hydrated: boolean;
}

export interface AdherenceSummary {
  days: AdherenceDay[];
  loggedDays: number;
  /** Logged days within 90–110% of calories and at least 90% of protein. */
  onTargetDays: number;
  /** Days that reached the water target (or the default when none is set). */
  hydratedDays: number;
  avgKcal: number | null;
  avgProteinG: number | null;
  avgWaterMl: number | null;
  waterTargetMl: number;
}

/**
 * Deterministic adherence over `days` (any order). Calorie band is 90–110% of target; protein must reach 90%.
 * Without a target, logged days are LOGGED and none count as on target.
 */
export function summarizeAdherence(days: DayIntakeDto[], target: Pick<NutritionTargetDto, 'kcal' | 'proteinG' | 'waterMl'> | null): AdherenceSummary {
  const waterTargetMl = target?.waterMl ?? NUTRITION_LIMITS.defaultWaterMl;
  const rows: AdherenceDay[] = [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const kcal = Number(d.kcal);
      const proteinG = Number(d.proteinG);
      const logged = d.entryCount > 0;
      const kcalPct = shareOf(kcal, target?.kcal);
      const proteinPct = shareOf(proteinG, target?.proteinG);
      let verdict: DayVerdict = logged ? 'LOGGED' : 'NO_LOG';
      if (logged && kcalPct !== null) {
        if (kcalPct > 110) verdict = 'OVER';
        else if (kcalPct >= 90 && (proteinPct === null || proteinPct >= 90)) verdict = 'ON_TARGET';
        else verdict = 'UNDER';
      }
      return { date: d.date, kcal, proteinG, waterMl: d.waterMl, logged, kcalPct, proteinPct, waterPct: shareOf(d.waterMl, waterTargetMl), verdict, hydrated: d.waterMl >= waterTargetMl };
    });
  const logged = rows.filter((r) => r.logged);
  const watered = rows.filter((r) => r.waterMl > 0);
  const avg = (xs: number[]): number | null => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
  return {
    days: rows,
    loggedDays: logged.length,
    onTargetDays: rows.filter((r) => r.verdict === 'ON_TARGET').length,
    hydratedDays: rows.filter((r) => r.hydrated).length,
    avgKcal: avg(logged.map((r) => r.kcal)),
    avgProteinG: avg(logged.map((r) => r.proteinG)),
    avgWaterMl: avg(watered.map((r) => r.waterMl)),
    waterTargetMl,
  };
}

/** The `count` calendar dates ending `today` (YYYY-MM-DD, UTC), oldest first. */
export function windowDates(today: string, count: number): string[] {
  const end = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => new Date(end - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}
