-- AlterTable
ALTER TABLE "diet_types" ADD COLUMN     "displayNames" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "medical_conditions" ADD COLUMN     "displayNames" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "triggerFoods" JSONB NOT NULL DEFAULT '[]';
