-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('CUSTOM', 'USDA', 'CNF');

-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "source" "FoodSource" NOT NULL DEFAULT 'CUSTOM',
    "name" VARCHAR(120) NOT NULL,
    "brand" VARCHAR(80),
    "servingG" DECIMAL(6,1) NOT NULL DEFAULT 100,
    "servingLabel" VARCHAR(40),
    "kcal" DECIMAL(5,1) NOT NULL,
    "proteinG" DECIMAL(4,1) NOT NULL,
    "carbsG" DECIMAL(4,1) NOT NULL,
    "fatG" DECIMAL(4,1) NOT NULL,
    "fiberG" DECIMAL(4,1),
    "sodiumMg" DECIMAL(7,1),
    "potassiumMg" DECIMAL(7,1),
    "calciumMg" DECIMAL(7,1),
    "ironMg" DECIMAL(6,2),
    "magnesiumMg" DECIMAL(7,1),
    "vitaminDMcg" DECIMAL(6,2),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealEntry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "slot" "MealSlot" NOT NULL,
    "foodId" TEXT,
    "name" VARCHAR(120) NOT NULL,
    "source" "FoodSource" NOT NULL,
    "grams" DECIMAL(6,1) NOT NULL,
    "kcal" DECIMAL(6,1) NOT NULL,
    "proteinG" DECIMAL(5,1) NOT NULL,
    "carbsG" DECIMAL(5,1) NOT NULL,
    "fatG" DECIMAL(5,1) NOT NULL,
    "fiberG" DECIMAL(5,1),
    "sodiumMg" DECIMAL(8,1),
    "potassiumMg" DECIMAL(8,1),
    "calciumMg" DECIMAL(8,1),
    "ironMg" DECIMAL(7,2),
    "magnesiumMg" DECIMAL(8,1),
    "vitaminDMcg" DECIMAL(7,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ml" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTarget" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "fiberG" INTEGER,
    "waterMl" INTEGER,
    "setById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealTemplate" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "grams" DECIMAL(6,1) NOT NULL,

    CONSTRAINT "MealTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodFavorite" (
    "userId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodFavorite_pkey" PRIMARY KEY ("userId","foodId")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanMeal" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" VARCHAR(80) NOT NULL,

    CONSTRAINT "MealPlanMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanItem" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "grams" DECIMAL(6,1) NOT NULL,

    CONSTRAINT "MealPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Food_ownerId_name_idx" ON "Food"("ownerId", "name");

-- CreateIndex
CREATE INDEX "MealEntry_clientId_date_idx" ON "MealEntry"("clientId", "date");

-- CreateIndex
CREATE INDEX "WaterLog_clientId_date_idx" ON "WaterLog"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionTarget_clientId_key" ON "NutritionTarget"("clientId");

-- CreateIndex
CREATE INDEX "MealTemplate_ownerId_idx" ON "MealTemplate"("ownerId");

-- CreateIndex
CREATE INDEX "MealTemplateItem_templateId_idx" ON "MealTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "MealPlan_clientId_idx" ON "MealPlan"("clientId");

-- CreateIndex
CREATE INDEX "MealPlan_coachId_idx" ON "MealPlan"("coachId");

-- CreateIndex
CREATE INDEX "MealPlanMeal_planId_idx" ON "MealPlanMeal"("planId");

-- CreateIndex
CREATE INDEX "MealPlanItem_mealId_idx" ON "MealPlanItem"("mealId");

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTarget" ADD CONSTRAINT "NutritionTarget_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTarget" ADD CONSTRAINT "NutritionTarget_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplate" ADD CONSTRAINT "MealTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplateItem" ADD CONSTRAINT "MealTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MealTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplateItem" ADD CONSTRAINT "MealTemplateItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodFavorite" ADD CONSTRAINT "FoodFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodFavorite" ADD CONSTRAINT "FoodFavorite_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanMeal" ADD CONSTRAINT "MealPlanMeal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanItem" ADD CONSTRAINT "MealPlanItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "MealPlanMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanItem" ADD CONSTRAINT "MealPlanItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Integrity checks Prisma cannot express
ALTER TABLE "Food" ADD CONSTRAINT "Food_owner_source_check" CHECK (("ownerId" IS NULL) = ("source" <> 'CUSTOM'));
ALTER TABLE "Food" ADD CONSTRAINT "Food_serving_check" CHECK ("servingG" > 0);
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_grams_check" CHECK ("grams" > 0);
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_ml_check" CHECK ("ml" BETWEEN 1 AND 5000);
ALTER TABLE "MealTemplate" ADD CONSTRAINT "MealTemplate_servings_check" CHECK ("servings" BETWEEN 1 AND 20);
ALTER TABLE "MealTemplateItem" ADD CONSTRAINT "MealTemplateItem_grams_check" CHECK ("grams" > 0);
ALTER TABLE "MealPlanItem" ADD CONSTRAINT "MealPlanItem_grams_check" CHECK ("grams" > 0);
ALTER TABLE "NutritionTarget" ADD CONSTRAINT "NutritionTarget_kcal_check" CHECK ("kcal" BETWEEN 1000 AND 8000);
ALTER TABLE "NutritionTarget" ADD CONSTRAINT "NutritionTarget_macros_check" CHECK ("proteinG" >= 0 AND "carbsG" >= 0 AND "fatG" >= 0);

-- Starter catalog: USDA FoodData Central (SR Legacy, public domain), values per 100 g.
INSERT INTO "Food" ("id", "source", "name", "servingG", "servingLabel", "kcal", "proteinG", "carbsG", "fatG", "fiberG", "sodiumMg", "potassiumMg", "calciumMg", "ironMg", "magnesiumMg", "vitaminDMcg") VALUES
  ('usda-chicken-breast-roasted', 'USDA', 'Chicken breast, roasted, skinless', 100, '100 g', 165, 31.0, 0, 3.6, 0, 74, 256, 15, 1.04, 29, 0.1),
  ('usda-rice-white-cooked', 'USDA', 'Rice, white, long-grain, cooked', 158, '1 cup', 130, 2.7, 28.2, 0.3, 0.4, 1, 35, 10, 1.20, 12, 0),
  ('usda-oats-rolled-dry', 'USDA', 'Oats, rolled, dry', 40, '1/2 cup', 379, 13.2, 67.7, 6.5, 10.1, 6, 362, 52, 4.25, 138, 0),
  ('usda-egg-whole', 'USDA', 'Egg, whole, raw', 50, '1 large', 143, 12.6, 0.7, 9.5, 0, 142, 138, 56, 1.75, 12, 2.0),
  ('usda-salmon-atlantic-cooked', 'USDA', 'Salmon, Atlantic, farmed, cooked', 150, '1 fillet', 206, 22.1, 0, 12.4, 0, 61, 384, 15, 0.34, 30, 13.1),
  ('usda-sweet-potato-baked', 'USDA', 'Sweet potato, baked in skin', 114, '1 medium', 90, 2.0, 20.7, 0.2, 3.3, 36, 475, 38, 0.69, 27, 0),
  ('usda-potato-baked', 'USDA', 'Potato, baked, flesh and skin', 173, '1 medium', 93, 2.5, 21.2, 0.1, 2.2, 10, 535, 15, 1.08, 28, 0),
  ('usda-broccoli-raw', 'USDA', 'Broccoli, raw', 91, '1 cup chopped', 34, 2.8, 6.6, 0.4, 2.6, 33, 316, 47, 0.73, 21, 0),
  ('usda-banana-raw', 'USDA', 'Banana, raw', 118, '1 medium', 89, 1.1, 22.8, 0.3, 2.6, 1, 358, 5, 0.26, 27, 0),
  ('usda-blueberries-raw', 'USDA', 'Blueberries, raw', 148, '1 cup', 57, 0.7, 14.5, 0.3, 2.4, 1, 77, 6, 0.28, 6, 0),
  ('usda-avocado-raw', 'USDA', 'Avocado, raw', 68, '1/2 fruit', 160, 2.0, 8.5, 14.7, 6.7, 7, 485, 12, 0.55, 29, 0),
  ('usda-greek-yogurt-nonfat', 'USDA', 'Greek yogurt, plain, nonfat', 170, '1 container', 59, 10.2, 3.6, 0.4, 0, 36, 141, 110, 0.07, 11, 0),
  ('usda-cottage-cheese-2pct', 'USDA', 'Cottage cheese, lowfat 2%', 113, '1/2 cup', 84, 11.0, 4.3, 2.3, 0, 321, 104, 111, 0.16, 9, 0),
  ('usda-milk-2pct', 'USDA', 'Milk, reduced fat 2%', 244, '1 cup', 50, 3.3, 4.8, 2.0, 0, 47, 140, 120, 0.02, 11, 1.2),
  ('usda-almonds', 'USDA', 'Almonds', 28, '1 oz', 579, 21.2, 21.6, 49.9, 12.5, 1, 733, 269, 3.71, 270, 0),
  ('usda-olive-oil', 'USDA', 'Olive oil', 13.5, '1 tbsp', 884, 0, 0, 100, 0, 2, 1, 1, 0.56, 0, 0),
  ('usda-beef-ground-90-cooked', 'USDA', 'Beef, ground, 90% lean, cooked', 100, '100 g', 217, 26.1, 0, 11.7, 0, 76, 365, 12, 2.70, 22, 0.1),
  ('usda-bread-whole-wheat', 'USDA', 'Bread, whole wheat', 32, '1 slice', 252, 12.4, 42.7, 3.5, 6.0, 455, 254, 161, 2.47, 76, 0),
  ('usda-pasta-cooked', 'USDA', 'Pasta, enriched, cooked', 140, '1 cup', 158, 5.8, 30.9, 0.9, 1.8, 1, 44, 7, 1.28, 18, 0);
