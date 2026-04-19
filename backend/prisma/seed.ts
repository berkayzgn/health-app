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

async function main() {
  await syncMedicalConditionsFromAbc();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
