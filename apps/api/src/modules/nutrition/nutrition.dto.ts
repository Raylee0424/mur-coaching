import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MEAL_SLOTS, NUTRITION_LIMITS as L } from '@coaching/shared';
import type {
  ItemInput,
  LogMealRequest,
  LogWaterRequest,
  MealSlot,
  SaveFoodRequest,
  SaveMealPlanRequest,
  SaveMealTemplateRequest,
  SaveNutritionTargetRequest,
} from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Dates use YYYY-MM-DD.';
/** Non-negative decimal string, up to 2 places. Range checks happen in the service. */
const DECIMAL = /^\d{1,6}(\.\d{1,2})?$/;
const DECIMAL_MESSAGE = 'Amounts are non-negative numbers with up to 2 decimals.';

export class Per100gDto {
  @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) kcal!: string;
  @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) proteinG!: string;
  @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) carbsG!: string;
  @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) fatG!: string;
  @IsOptional() @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) fiberG?: string | null;
  @IsOptional() @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) sodiumMg?: string | null;
  @IsOptional() @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) potassiumMg?: string | null;
  @IsOptional() @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) calciumMg?: string | null;
  @IsOptional() @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) ironMg?: string | null;
  @IsOptional() @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) magnesiumMg?: string | null;
  @IsOptional() @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) vitaminDMcg?: string | null;
}

export class SaveFoodDto implements SaveFoodRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(120)
  name!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  brand?: string | null;

  @Matches(DECIMAL, { message: DECIMAL_MESSAGE })
  servingG!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(40)
  servingLabel?: string | null;

  @ValidateNested() @Type(() => Per100gDto)
  per100g!: Per100gDto;
}

export class SearchFoodsQuery {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60)
  q?: string;
}

export class DayQuery {
  @IsOptional() @Matches(DATE, { message: DATE_MESSAGE })
  date?: string;
}

export class LogMealDto implements LogMealRequest {
  @Matches(DATE, { message: DATE_MESSAGE })
  date!: string;

  @IsIn(MEAL_SLOTS)
  slot!: MealSlot;

  @IsOptional() @IsString() foodId?: string;
  @IsOptional() @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) grams?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) servings?: string;
  @IsOptional() @IsString() planMealId?: string;
}

export class LogWaterDto implements LogWaterRequest {
  @Matches(DATE, { message: DATE_MESSAGE })
  date!: string;

  @IsInt() @Min(1) @Max(L.maxWaterEntryMl)
  ml!: number;
}

export class SaveNutritionTargetDto implements SaveNutritionTargetRequest {
  @IsInt() @Min(L.minKcal, { message: `Calories must be at least ${L.minKcal} kcal.` }) @Max(L.maxKcal)
  kcal!: number;

  @IsInt() @Min(0) @Max(L.maxProteinG) proteinG!: number;
  @IsInt() @Min(0) @Max(L.maxCarbsG) carbsG!: number;
  @IsInt() @Min(0) @Max(L.maxFatG) fatG!: number;
  @IsOptional() @IsInt() @Min(0) @Max(L.maxFiberG) fiberG?: number | null;
  @IsOptional() @IsInt() @Min(L.minWaterMl) @Max(L.maxWaterMl) waterMl?: number | null;
}

export class ItemDto implements ItemInput {
  @IsString() foodId!: string;
  @Matches(DECIMAL, { message: DECIMAL_MESSAGE }) grams!: string;
}

export class SaveMealTemplateDto implements SaveMealTemplateRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80)
  name!: string;

  @IsInt() @Min(1) @Max(L.maxTemplateServings)
  servings!: number;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(L.maxTemplateItems) @ValidateNested({ each: true }) @Type(() => ItemDto)
  items!: ItemDto[];
}

export class PlanMealDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80)
  name!: string;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(L.maxPlanItemsPerMeal) @ValidateNested({ each: true }) @Type(() => ItemDto)
  items!: ItemDto[];
}

export class SaveMealPlanDto implements SaveMealPlanRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80)
  name!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  notes?: string | null;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(L.maxPlanMeals) @ValidateNested({ each: true }) @Type(() => PlanMealDto)
  meals!: PlanMealDto[];
}
