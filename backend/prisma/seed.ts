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

type TestRule = {
  rule_code: string;
  rule_type: string;
  trigger_type: string;
  trigger_name: string;
  operator: string;
  threshold: number;
  unit: string;
  period: string;
  risk_level: string;
  decision: string;
  user_message: string;
  ingredient_keywords: string[];
};

type TestCondition = {
  condition_group: string;
  condition_name: string;
  rules: TestRule[];
};

type TestAllergy = {
  allergy_name: string;
  rules: TestRule[];
};

type TestFile = {
  conditions: TestCondition[];
  allergies: TestAllergy[];
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

function seedFoldTurkishAscii(s: string): string {
  const map: Record<string, string> = {
    ş: 's',
    Ş: 's',
    ğ: 'g',
    Ğ: 'g',
    ü: 'u',
    Ü: 'u',
    ö: 'o',
    Ö: 'o',
    ç: 'c',
    Ç: 'c',
    ı: 'i',
    İ: 'i',
    â: 'a',
    Â: 'a',
    î: 'i',
    Î: 'i',
    û: 'u',
    Û: 'u',
  };
  return s
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase();
}

function seedRuleTriggerSlug(triggerNameTr: string): string {
  const folded = seedFoldTurkishAscii(triggerNameTr.trim()).replace(/\s+/g, ' ');
  return folded
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
}

function seedNormalizePeriod(raw: string): string {
  const f = seedFoldTurkishAscii(raw.trim());
  if (f === 'gun') return 'DAY';
  if (f === 'ogun') return 'MEAL';
  if (f === 'urun') return 'PRODUCT';
  if (f === 'hafta') return 'WEEK';
  console.warn('[seed] bilinmeyen period:', raw, '→ DAY');
  return 'DAY';
}

function seedRuleScope(rule: TestRule): string {
  if (rule.rule_type === 'BEHAVIOR') return 'advice';
  if (rule.rule_type === 'COMBO') return 'advice';
  return 'scan';
}

function resolveTestJsonPath(): string {
  const candidates = [
    path.join(__dirname, '..', '..', 'docs', 'test.json'),
    path.join(process.cwd(), 'docs', 'test.json'),
    path.join(process.cwd(), '..', 'docs', 'test.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('docs/test.json bulunamadı.');
}

function loadTestFile(): TestFile {
  const p = resolveTestJsonPath();
  const raw = fs.readFileSync(p, 'utf-8');
  return JSON.parse(raw) as TestFile;
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

async function syncGroupLabelsAndRulesFromTest(): Promise<void> {
  let testData: TestFile;
  try {
    testData = loadTestFile();
  } catch (e) {
    console.warn('[seed]', e);
    return;
  }

  const abc = loadAbc();
  const diseaseLabelToCode = new Map((abc.diseases ?? []).map((d) => [d.label, d.key]));
  const allergyLabelToCode = new Map((abc.allergies ?? []).map((a) => [a.label, a.key]));

  for (const c of testData.conditions) {
    const code = diseaseLabelToCode.get(c.condition_name);
    if (!code) {
      console.warn(`[seed] Hastalık etiketi eşlemesi yok: "${c.condition_name}"`);
      continue;
    }
    await prisma.medicalCondition.updateMany({
      where: { code },
      data: { groupLabel: c.condition_group },
    });
  }

  for (const a of testData.allergies) {
    const code = allergyLabelToCode.get(a.allergy_name);
    if (!code) {
      console.warn(`[seed] Alerji etiketi eşlemesi yok: "${a.allergy_name}"`);
      continue;
    }
    await prisma.medicalCondition.updateMany({
      where: { code },
      data: { groupLabel: 'Alerjen' },
    });
  }

  const allRuleCodes: string[] = [];

  for (const c of testData.conditions) {
    const code = diseaseLabelToCode.get(c.condition_name);
    if (!code) continue;
    const condRow = await prisma.medicalCondition.findUnique({
      where: { code },
    });
    if (!condRow) continue;

    for (const rule of c.rules) {
      allRuleCodes.push(rule.rule_code);
      const keywordsSlug = (rule.ingredient_keywords ?? []).map(seedRuleTriggerSlug);
      const messages = { tr: rule.user_message, en: rule.user_message };

      await prisma.medicalConditionRule.upsert({
        where: { code: rule.rule_code },
        create: {
          code: rule.rule_code,
          conditionId: condRow.id,
          ruleType: rule.rule_type,
          triggerType: rule.trigger_type,
          triggerName: rule.trigger_name,
          triggerSlug: seedRuleTriggerSlug(rule.trigger_name),
          operator: rule.operator,
          threshold: rule.threshold,
          unit: rule.unit,
          period: seedNormalizePeriod(rule.period),
          riskLevel: rule.risk_level,
          scope: seedRuleScope(rule),
          messages,
          keywords: rule.ingredient_keywords ?? [],
          keywordsSlug,
        },
        update: {
          ruleType: rule.rule_type,
          triggerType: rule.trigger_type,
          triggerName: rule.trigger_name,
          triggerSlug: seedRuleTriggerSlug(rule.trigger_name),
          operator: rule.operator,
          threshold: rule.threshold,
          unit: rule.unit,
          period: seedNormalizePeriod(rule.period),
          riskLevel: rule.risk_level,
          scope: seedRuleScope(rule),
          messages,
          keywords: rule.ingredient_keywords ?? [],
          keywordsSlug,
        },
      });
    }
  }

  for (const a of testData.allergies) {
    const code = allergyLabelToCode.get(a.allergy_name);
    if (!code) continue;
    const condRow = await prisma.medicalCondition.findUnique({
      where: { code },
    });
    if (!condRow) continue;

    for (const rule of a.rules) {
      allRuleCodes.push(rule.rule_code);
      const keywordsSlug = (rule.ingredient_keywords ?? []).map(seedRuleTriggerSlug);
      const messages = { tr: rule.user_message, en: rule.user_message };

      await prisma.medicalConditionRule.upsert({
        where: { code: rule.rule_code },
        create: {
          code: rule.rule_code,
          conditionId: condRow.id,
          ruleType: rule.rule_type,
          triggerType: rule.trigger_type,
          triggerName: rule.trigger_name,
          triggerSlug: seedRuleTriggerSlug(rule.trigger_name),
          operator: rule.operator,
          threshold: rule.threshold,
          unit: rule.unit,
          period: seedNormalizePeriod(rule.period),
          riskLevel: rule.risk_level,
          scope: 'scan',
          messages,
          keywords: rule.ingredient_keywords ?? [],
          keywordsSlug,
        },
        update: {
          ruleType: rule.rule_type,
          triggerType: rule.trigger_type,
          triggerName: rule.trigger_name,
          triggerSlug: seedRuleTriggerSlug(rule.trigger_name),
          operator: rule.operator,
          threshold: rule.threshold,
          unit: rule.unit,
          period: seedNormalizePeriod(rule.period),
          riskLevel: rule.risk_level,
          scope: 'scan',
          messages,
          keywords: rule.ingredient_keywords ?? [],
          keywordsSlug,
        },
      });
    }
  }

  const uniqueCodes = [...new Set(allRuleCodes)];
  if (uniqueCodes.length > 0) {
    await prisma.medicalConditionRule.deleteMany({
      where: { code: { notIn: uniqueCodes } },
    });
  }

  console.log(`✓ medical_condition_rules: ${uniqueCodes.length} kural (docs/test.json → DB)`);
}

async function main() {
  await syncMedicalConditionsFromAbc();
  await syncGroupLabelsAndRulesFromTest();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
