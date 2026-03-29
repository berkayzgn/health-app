-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_dietMacroTemplateId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "dietMacroTemplateId",
ADD COLUMN     "activeDietVariantId" TEXT,
ADD COLUMN     "gender" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE IF EXISTS "diet_macro_templates";

-- CreateTable
CREATE TABLE "diet_variants" (
    "id" TEXT NOT NULL,
    "dietTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "displayNames" JSONB NOT NULL DEFAULT '{}',
    "gender" TEXT NOT NULL DEFAULT 'any',
    "bmiMin" DOUBLE PRECISION,
    "bmiMax" DOUBLE PRECISION,
    "targetCalories" INTEGER NOT NULL,
    "targetProtein" INTEGER NOT NULL,
    "targetCarbs" INTEGER NOT NULL,
    "targetFat" INTEGER NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diet_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "diet_variants_code_key" ON "diet_variants"("code");

-- CreateIndex
CREATE INDEX "diet_variants_dietTypeId_idx" ON "diet_variants"("dietTypeId");

-- CreateIndex
CREATE INDEX "diet_variants_gender_bmiMin_bmiMax_idx" ON "diet_variants"("gender", "bmiMin", "bmiMax");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeDietVariantId_fkey" FOREIGN KEY ("activeDietVariantId") REFERENCES "diet_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_variants" ADD CONSTRAINT "diet_variants_dietTypeId_fkey" FOREIGN KEY ("dietTypeId") REFERENCES "diet_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
