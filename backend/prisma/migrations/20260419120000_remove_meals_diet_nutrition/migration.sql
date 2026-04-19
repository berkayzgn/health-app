-- Öğün, diyet kataloğu ve beslenme hedefi alanlarını kaldır.

ALTER TABLE "meals" DROP CONSTRAINT IF EXISTS "meals_userId_fkey";
DROP TABLE IF EXISTS "meals";

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_activeDietVariantId_fkey";

ALTER TABLE "user_diet_preferences" DROP CONSTRAINT IF EXISTS "user_diet_preferences_userId_fkey";
ALTER TABLE "user_diet_preferences" DROP CONSTRAINT IF EXISTS "user_diet_preferences_dietTypeId_fkey";
DROP TABLE IF EXISTS "user_diet_preferences";

ALTER TABLE "diet_variants" DROP CONSTRAINT IF EXISTS "diet_variants_dietTypeId_fkey";
DROP TABLE IF EXISTS "diet_variants";

DROP TABLE IF EXISTS "diet_types";

ALTER TABLE "users" DROP COLUMN IF EXISTS "activeDietVariantId";
ALTER TABLE "users" DROP COLUMN IF EXISTS "selectedDietTypeCode";
ALTER TABLE "users" DROP COLUMN IF EXISTS "dailyCalorieGoal";
ALTER TABLE "users" DROP COLUMN IF EXISTS "macroGoals";
ALTER TABLE "users" DROP COLUMN IF EXISTS "heightCm";
ALTER TABLE "users" DROP COLUMN IF EXISTS "weightKg";
ALTER TABLE "users" DROP COLUMN IF EXISTS "age";
ALTER TABLE "users" DROP COLUMN IF EXISTS "activityLevel";
ALTER TABLE "users" DROP COLUMN IF EXISTS "goal";
ALTER TABLE "users" DROP COLUMN IF EXISTS "gender";
