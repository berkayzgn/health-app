-- Katalog: hastalık / diyet tipleri (users üzerindeki dizi kolonlarından ayrıldı).

CREATE TABLE "medical_conditions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "medical_conditions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "medical_conditions_code_key" ON "medical_conditions"("code");

CREATE TABLE "diet_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "diet_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "diet_types_code_key" ON "diet_types"("code");

INSERT INTO "medical_conditions" ("id", "code", "sortOrder") VALUES
('11111111-1111-4111-8111-111111110001', 'diabetes', 0),
('11111111-1111-4111-8111-111111110002', 'hypertension', 1),
('11111111-1111-4111-8111-111111110003', 'asthma', 2);

INSERT INTO "diet_types" ("id", "code", "sortOrder") VALUES
('22222222-2222-4222-8222-222222220001', 'gluten_free', 0),
('22222222-2222-4222-8222-222222220002', 'keto', 1),
('22222222-2222-4222-8222-222222220003', 'lactose_intolerant', 2),
('22222222-2222-4222-8222-222222220004', 'vegan', 3);

CREATE TABLE "user_medical_conditions" (
    "userId" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    CONSTRAINT "user_medical_conditions_pkey" PRIMARY KEY ("userId","conditionId")
);

CREATE TABLE "user_custom_health_tags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "user_custom_health_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_custom_health_tags_userId_label_key" ON "user_custom_health_tags"("userId", "label");

CREATE TABLE "user_diet_preferences" (
    "userId" TEXT NOT NULL,
    "dietTypeId" TEXT NOT NULL,
    CONSTRAINT "user_diet_preferences_pkey" PRIMARY KEY ("userId","dietTypeId")
);

ALTER TABLE "user_medical_conditions" ADD CONSTRAINT "user_medical_conditions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_medical_conditions" ADD CONSTRAINT "user_medical_conditions_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "medical_conditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_custom_health_tags" ADD CONSTRAINT "user_custom_health_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_diet_preferences" ADD CONSTRAINT "user_diet_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_diet_preferences" ADD CONSTRAINT "user_diet_preferences_dietTypeId_fkey" FOREIGN KEY ("dietTypeId") REFERENCES "diet_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mevcut users.conditionTypes / dietaryPreferences → ilişki tabloları
INSERT INTO "user_medical_conditions" ("userId", "conditionId")
SELECT DISTINCT u."id", mc."id"
FROM "users" u
CROSS JOIN LATERAL unnest(COALESCE(u."conditionTypes", ARRAY[]::text[])) AS ct
INNER JOIN "medical_conditions" mc ON mc."code" = ct
WHERE ct IS NOT NULL AND ct <> 'none' AND ct NOT LIKE 'other:%';

INSERT INTO "user_custom_health_tags" ("id", "userId", "label")
SELECT gen_random_uuid()::text, x."userId", x."label"
FROM (
  SELECT DISTINCT u."id" AS "userId", substring(ct from 7) AS "label"
  FROM "users" u
  CROSS JOIN LATERAL unnest(COALESCE(u."conditionTypes", ARRAY[]::text[])) AS ct
  WHERE ct LIKE 'other:%' AND length(substring(ct from 7)) > 0
) x;

INSERT INTO "user_diet_preferences" ("userId", "dietTypeId")
SELECT DISTINCT u."id", dt."id"
FROM "users" u
CROSS JOIN LATERAL unnest(COALESCE(u."dietaryPreferences", ARRAY[]::text[])) AS dp
INNER JOIN "diet_types" dt ON dt."code" = dp
WHERE dp IS NOT NULL AND dp <> '';

ALTER TABLE "users" DROP COLUMN "conditionTypes";
ALTER TABLE "users" DROP COLUMN "dietaryPreferences";
