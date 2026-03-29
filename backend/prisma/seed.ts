import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

type AbcCondition = {
  key: string;
  label: string;
  label_en?: string;
  filters: string[];
  category: string;
};

type AbcFile = {
  diseases: AbcCondition[];
  allergies: AbcCondition[];
};

function resolveAbcJsonPath(): string {
  const candidates = [
    path.join(__dirname, '..', '..', 'abc.json'),
    path.join(__dirname, '..', 'abc.json'),
    path.join(process.cwd(), 'abc.json'),
    path.join(process.cwd(), '..', 'abc.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    'abc.json bulunamadı. Proje kökünde (health-ai-app/abc.json) olmalı; seed: backend klasöründen çalıştırın.',
  );
}

function loadAbc(): AbcFile {
  const p = resolveAbcJsonPath();
  const raw = fs.readFileSync(p, 'utf-8');
  return JSON.parse(raw) as AbcFile;
}

/** abc.json diseases + allergies → medical_conditions (tek tablo, kind ile ayrım). */
async function syncMedicalConditionsFromAbc() {
  const abc = loadAbc();
  const diseases = abc.diseases ?? [];
  const allergies = abc.allergies ?? [];
  const codes = [...diseases.map((d) => d.key), ...allergies.map((a) => a.key)];

  await prisma.userMedicalCondition.deleteMany({
    where: { condition: { code: { notIn: codes } } },
  });
  await prisma.medicalCondition.deleteMany({
    where: { code: { notIn: codes } },
  });

  let sortOrder = 0;
  for (const d of diseases) {
    const displayNames = { tr: d.label, en: d.label_en ?? d.label };
    await prisma.medicalCondition.upsert({
      where: { code: d.key },
      create: {
        code: d.key,
        kind: 'disease',
        sortOrder,
        displayNames,
        triggerFoods: d.filters,
      },
      update: {
        kind: 'disease',
        sortOrder,
        displayNames,
        triggerFoods: d.filters,
      },
    });
    sortOrder += 1;
  }
  for (const a of allergies) {
    const displayNames = { tr: a.label, en: a.label_en ?? a.label };
    await prisma.medicalCondition.upsert({
      where: { code: a.key },
      create: {
        code: a.key,
        kind: 'allergy',
        sortOrder,
        displayNames,
        triggerFoods: a.filters,
      },
      update: {
        kind: 'allergy',
        sortOrder,
        displayNames,
        triggerFoods: a.filters,
      },
    });
    sortOrder += 1;
  }
  console.log(
    `✓ medical_conditions: ${diseases.length} hastalık + ${allergies.length} alerji (abc.json → DB)`,
  );
}

// ── Diet types (değişmedi) ───────────────────────────────────────────────────

const dietRestrictions = [
  {
    id: '22222222-2222-4222-8222-222222220001',
    code: 'gluten_free',
    sortOrder: 0,
    displayNames: { en: 'Gluten Free', tr: 'Glutensiz' },
    category: 'restriction',
    macros: {},
  },
  {
    id: '22222222-2222-4222-8222-222222220002',
    code: 'keto',
    sortOrder: 1,
    displayNames: { en: 'Ketogenic', tr: 'Ketojenik' },
    category: 'restriction',
    macros: {},
  },
  {
    id: '22222222-2222-4222-8222-222222220003',
    code: 'lactose_intolerant',
    sortOrder: 2,
    displayNames: { en: 'Lactose Free', tr: 'Laktozsuz' },
    category: 'restriction',
    macros: {},
  },
  {
    id: '22222222-2222-4222-8222-222222220004',
    code: 'vegan',
    sortOrder: 3,
    displayNames: { en: 'Vegan', tr: 'Vegan' },
    category: 'restriction',
    macros: {},
  },
  {
    id: '22222222-2222-4222-8222-222222220005',
    code: 'vegetarian',
    sortOrder: 4,
    displayNames: { en: 'Vegetarian', tr: 'Vejetaryen' },
    category: 'restriction',
    macros: {},
  },
  {
    id: '22222222-2222-4222-8222-222222220006',
    code: 'pescatarian',
    sortOrder: 5,
    displayNames: { en: 'Pescatarian', tr: 'Pesketaryen' },
    category: 'restriction',
    macros: {},
  },
  {
    id: '22222222-2222-4222-8222-222222220007',
    code: 'halal',
    sortOrder: 6,
    displayNames: { en: 'Halal', tr: 'Helal' },
    category: 'restriction',
    macros: {},
  },
  {
    id: '22222222-2222-4222-8222-222222220008',
    code: 'low_sodium',
    sortOrder: 7,
    displayNames: { en: 'Low Sodium', tr: 'Düşük Sodyum' },
    category: 'restriction',
    macros: {},
  },
  {
    id: '22222222-2222-4222-8222-222222220009',
    code: 'low_sugar',
    sortOrder: 8,
    displayNames: { en: 'Low Sugar', tr: 'Düşük Şeker' },
    category: 'restriction',
    macros: {},
  },
];

const macroPlanDietTypes = [
  {
    id: '33333333-3333-4333-8333-333333330001',
    code: 'balanced',
    sortOrder: 100,
    displayNames: { en: 'Balanced', tr: 'Dengeli' },
    category: 'macro_plan',
    macros: { proteinRatio: 0.2, carbRatio: 0.5, fatRatio: 0.3 },
  },
  {
    id: '33333333-3333-4333-8333-333333330002',
    code: 'high_protein',
    sortOrder: 101,
    displayNames: { en: 'High Protein', tr: 'Yüksek Protein' },
    category: 'macro_plan',
    macros: { proteinRatio: 0.3, carbRatio: 0.4, fatRatio: 0.3 },
  },
  {
    id: '33333333-3333-4333-8333-333333330003',
    code: 'low_carb',
    sortOrder: 102,
    displayNames: { en: 'Low Carb', tr: 'Düşük Karbonhidrat' },
    category: 'macro_plan',
    macros: { proteinRatio: 0.3, carbRatio: 0.2, fatRatio: 0.5 },
  },
  {
    id: '33333333-3333-4333-8333-333333330004',
    code: 'low_fat',
    sortOrder: 103,
    displayNames: { en: 'Low Fat', tr: 'Düşük Yağ' },
    category: 'macro_plan',
    macros: { proteinRatio: 0.25, carbRatio: 0.55, fatRatio: 0.2 },
  },
  {
    id: '33333333-3333-4333-8333-333333330005',
    code: 'high_carb',
    sortOrder: 104,
    displayNames: { en: 'High Carb', tr: 'Yüksek Karbonhidrat' },
    category: 'macro_plan',
    macros: { proteinRatio: 0.2, carbRatio: 0.55, fatRatio: 0.25 },
  },
];

const dietTypes = [...dietRestrictions, ...macroPlanDietTypes];

async function main() {
  await syncMedicalConditionsFromAbc();

  for (const dt of dietTypes) {
    await prisma.dietType.upsert({
      where: { id: dt.id },
      update: {
        code: dt.code,
        sortOrder: dt.sortOrder,
        displayNames: dt.displayNames,
        category: dt.category,
        macros: dt.macros,
      },
      create: dt,
    });
  }
  console.log(
    `✓ ${dietTypes.length} diet types upserted (${dietRestrictions.length} restrictions + ${macroPlanDietTypes.length} macro plans)`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
