-- Kural deposu + tarama besin özeti + tüketim günlük takibi

ALTER TABLE "medical_conditions" ADD COLUMN "groupLabel" TEXT;

CREATE TABLE "medical_condition_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerName" TEXT NOT NULL,
    "triggerSlug" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'scan',
    "messages" JSONB NOT NULL DEFAULT '{}',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "keywordsSlug" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "medical_condition_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "medical_condition_rules_code_key" ON "medical_condition_rules"("code");

CREATE INDEX "medical_condition_rules_conditionId_idx" ON "medical_condition_rules"("conditionId");

CREATE INDEX "medical_condition_rules_period_idx" ON "medical_condition_rules"("period");

ALTER TABLE "medical_condition_rules" ADD CONSTRAINT "medical_condition_rules_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "medical_conditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scan_history" ADD COLUMN "nutrientsPerServing" JSONB;
ALTER TABLE "scan_history" ADD COLUMN "servingSizeG" DOUBLE PRECISION;
ALTER TABLE "scan_history" ADD COLUMN "consumed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scan_history" ADD COLUMN "consumedAt" TIMESTAMP(3);
ALTER TABLE "scan_history" ADD COLUMN "portionsConsumed" DOUBLE PRECISION NOT NULL DEFAULT 1;

CREATE TABLE "consumption_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localDate" TEXT NOT NULL,
    "portions" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "nutrientsScaled" JSONB NOT NULL,

    CONSTRAINT "consumption_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consumption_logs_scanId_key" ON "consumption_logs"("scanId");

CREATE INDEX "consumption_logs_userId_localDate_idx" ON "consumption_logs"("userId", "localDate");

ALTER TABLE "consumption_logs" ADD CONSTRAINT "consumption_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "consumption_logs" ADD CONSTRAINT "consumption_logs_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;
