/** Tarama çıktısı / consumption_logs için ortak camelCase anahtarlar */

export interface NutrientsPerServing {
  energyKcal?: number | null;
  carbohydrateG?: number | null;
  sugarG?: number | null;
  simpleSugarG?: number | null;
  refinedCarbG?: number | null;
  fiberG?: number | null;
  fatG?: number | null;
  saturatedFatG?: number | null;
  transFatG?: number | null;
  sodiumMg?: number | null;
  saltG?: number | null;
  cholesterolMg?: number | null;
  caffeineMg?: number | null;
  proteinG?: number | null;
  fructoseG?: number | null;
  potassiumMg?: number | null;
  phosphorusMg?: number | null;
  alcoholG?: number | null;
  purineMg?: number | null;
  lactoseG?: number | null;
  waterL?: number | null;
  fodmapApproxG?: number | null;
  glutenMg?: number | null;
  chocolateG?: number | null;
}

export type NutrientTotals = Record<string, number>;

const NUM_FIELDS: (keyof NutrientsPerServing)[] = [
  'energyKcal',
  'carbohydrateG',
  'sugarG',
  'simpleSugarG',
  'refinedCarbG',
  'fiberG',
  'fatG',
  'saturatedFatG',
  'transFatG',
  'sodiumMg',
  'saltG',
  'cholesterolMg',
  'caffeineMg',
  'proteinG',
  'fructoseG',
  'potassiumMg',
  'phosphorusMg',
  'alcoholG',
  'purineMg',
  'lactoseG',
  'waterL',
  'fodmapApproxG',
  'glutenMg',
  'chocolateG',
];

const SNAKE_ALIASES: Record<string, keyof NutrientsPerServing> = {
  energy_kcal: 'energyKcal',
  carbohydrate_g: 'carbohydrateG',
  sugar_g: 'sugarG',
  simple_sugar_g: 'simpleSugarG',
  refined_carb_g: 'refinedCarbG',
  fiber_g: 'fiberG',
  fat_g: 'fatG',
  saturated_fat_g: 'saturatedFatG',
  trans_fat_g: 'transFatG',
  sodium_mg: 'sodiumMg',
  salt_g: 'saltG',
  cholesterol_mg: 'cholesterolMg',
  caffeine_mg: 'caffeineMg',
  protein_g: 'proteinG',
  fructose_g: 'fructoseG',
  potassium_mg: 'potassiumMg',
  phosphorus_mg: 'phosphorusMg',
  alcohol_g: 'alcoholG',
  purine_mg: 'purineMg',
  lactose_g: 'lactoseG',
  water_l: 'waterL',
  fodmap_approx_g: 'fodmapApproxG',
  gluten_mg: 'glutenMg',
  chocolate_g: 'chocolateG',
};

/** Kayıttaki JSON nesnesini NutrientsPerServing biçimine indirger. */
export function parseNutrientsPerServing(raw: unknown): Partial<NutrientsPerServing> {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<NutrientsPerServing> = {};
  for (const key of NUM_FIELDS) {
    const v = o[key as string];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[key] = v as number;
    }
  }
  for (const [sk, dk] of Object.entries(SNAKE_ALIASES)) {
    const val = o[sk];
    if (typeof val === 'number' && Number.isFinite(val) && out[dk] == null) {
      out[dk] = val;
    }
  }
  return out;
}

/** Sadece sayısal anahtarları içeren nesneyi çıkarır. */
export function compactNumericRecord(
  n: Partial<NutrientsPerServing>,
): Partial<NutrientsPerServing> {
  const o: Partial<NutrientsPerServing> = {};
  for (const [k, v] of Object.entries(n)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      (o as Record<string, number>)[k] = v;
    }
  }
  return o;
}

export function scaleNutrientsJson(
  n: Partial<NutrientsPerServing>,
  portions: number,
): Partial<NutrientsPerServing> {
  const factor = portions > 0 && Number.isFinite(portions) ? portions : 1;
  const o: Partial<NutrientsPerServing> = {};
  for (const [k, v] of Object.entries(n)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      (o as Record<string, number>)[k] = v * factor;
    }
  }
  return o;
}

export function sumNutrientRecords(
  records: Partial<NutrientsPerServing>[],
): NutrientTotals {
  const acc: NutrientTotals = {};
  for (const r of records) {
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        acc[k] = (acc[k] ?? 0) + v;
      }
    }
  }
  return acc;
}

/** Yağ enerjinin toplam enerjiye oranı (%). Enerji eksik veya sıfırsa null */
export function fatEnergyPercentFromTotals(t: NutrientTotals): number | null {
  const fat = t.fatG ?? 0;
  const energy = t.energyKcal ?? 0;
  if (energy <= 0) return null;
  return Math.min(100, (fat * 9) / energy * 100);
}
