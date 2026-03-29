-- CreateTable
CREATE TABLE "scan_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL DEFAULT 'Scanned Product',
    "rawIngredients" JSONB NOT NULL DEFAULT '[]',
    "matchedTriggers" JSONB NOT NULL DEFAULT '[]',
    "safetyLabel" TEXT NOT NULL DEFAULT 'safe',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scan_history_userId_idx" ON "scan_history"("userId");

-- CreateIndex
CREATE INDEX "scan_history_userId_scannedAt_idx" ON "scan_history"("userId", "scannedAt");

-- AddForeignKey
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
