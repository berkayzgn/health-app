-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dietMacroTemplateId" TEXT;

-- CreateTable
CREATE TABLE "diet_macro_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "referenceCalories" INTEGER NOT NULL DEFAULT 2000,
    "displayNames" JSONB NOT NULL,
    "macros" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diet_macro_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "diet_macro_templates_code_key" ON "diet_macro_templates"("code");

-- Makro şablonları (referans: 2000 kcal; gram/kcal tutarlılığı veriyle aynı)
INSERT INTO "diet_macro_templates" ("id", "code", "sortOrder", "referenceCalories", "displayNames", "macros", "createdAt", "updatedAt")
VALUES
(
  '33333333-3333-4333-8333-333333330001',
  'high_protein',
  0,
  2000,
  '{"en":"High Protein","tr":"Yüksek Protein"}'::jsonb,
  '{"protein":{"percentage":40,"grams":200,"calories":800,"kcal_per_gram":4},"carbohydrate":{"percentage":30,"grams":150,"calories":600,"kcal_per_gram":4},"fat":{"percentage":30,"grams":67,"calories":600,"kcal_per_gram":9}}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '33333333-3333-4333-8333-333333330002',
  'low_carbohydrate',
  1,
  2000,
  '{"en":"Low Carbohydrate","tr":"Düşük Karbonhidrat"}'::jsonb,
  '{"protein":{"percentage":35,"grams":175,"calories":700,"kcal_per_gram":4},"carbohydrate":{"percentage":15,"grams":75,"calories":300,"kcal_per_gram":4},"fat":{"percentage":50,"grams":111,"calories":1000,"kcal_per_gram":9}}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '33333333-3333-4333-8333-333333330003',
  'low_fat',
  2,
  2000,
  '{"en":"Low Fat","tr":"Düşük Yağ"}'::jsonb,
  '{"protein":{"percentage":30,"grams":150,"calories":600,"kcal_per_gram":4},"carbohydrate":{"percentage":55,"grams":275,"calories":1100,"kcal_per_gram":4},"fat":{"percentage":15,"grams":33,"calories":300,"kcal_per_gram":9}}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_dietMacroTemplateId_fkey" FOREIGN KEY ("dietMacroTemplateId") REFERENCES "diet_macro_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
