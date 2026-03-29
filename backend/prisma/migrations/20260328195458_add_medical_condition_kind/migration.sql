-- AlterTable
ALTER TABLE "medical_conditions" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'disease';

-- CreateIndex
CREATE INDEX "medical_conditions_kind_idx" ON "medical_conditions"("kind");
