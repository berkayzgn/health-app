-- Plan tabanlı günlük tarama kotası
ALTER TABLE "users" ADD COLUMN "subscriptionPlan" TEXT NOT NULL DEFAULT 'starter';
