import type { NutrientTotals } from './nutrient-json';
import { fatEnergyPercentFromTotals } from './nutrient-json';
import type { MedicalConditionRule } from '@prisma/client';

export type MetricReadiness =
  | 'ok'
  | 'missing_data'
  | 'missing_body_weight'
  | 'missing_energy_proxy'
  | 'unsupported';

function num(t: NutrientTotals, key: keyof NutrientTotals | string): number | null {
  const v = t[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

const UNSUPPORTED_SLUGS = new Set([
  'seker_yag',
  'kalori_fazlasi',
  'gaz_yapan_gida',
  'fast_food',
  'hizli_kilo_kaybi',
]);

/**
 * Günlük toplamlar + kural için ölçülen miktarı çözümleür.
 */
export function resolveMetricForRule(
  totals: NutrientTotals,
  rule: Pick<MedicalConditionRule, 'triggerSlug' | 'unit' | 'operator'>,
): { value: number | null; readiness: MetricReadiness } {
  const slug = rule.triggerSlug;
  const unit = rule.unit;

  if (UNSUPPORTED_SLUGS.has(slug)) {
    return { value: null, readiness: 'unsupported' };
  }

  if (unit === 'percent_energy' && slug === 'yag') {
    const p = fatEnergyPercentFromTotals(totals);
    if (p == null) return { value: null, readiness: 'missing_energy_proxy' };
    return { value: p, readiness: 'ok' };
  }

  if (unit === 'g/kg' && slug === 'protein') {
    return { value: null, readiness: 'missing_body_weight' };
  }

  if (unit === 'ml+idrar') {
    return { value: null, readiness: 'unsupported' };
  }

  switch (slug) {
    case 'seker':
      return wrap(num(totals, 'sugarG'));
    case 'basit_seker':
      return wrap(num(totals, 'simpleSugarG') ?? num(totals, 'sugarG'));
    case 'karbonhidrat':
      return wrap(num(totals, 'carbohydrateG'));
    case 'rafine_karbonhidrat':
      return wrap(num(totals, 'refinedCarbG') ?? num(totals, 'carbohydrateG'));
    case 'fruktoz':
      return wrap(num(totals, 'fructoseG') ?? num(totals, 'sugarG'));
    case 'lif':
      return wrap(num(totals, 'fiberG'));
    case 'sodyum':
      return wrap(num(totals, 'sodiumMg'));
    case 'tuz':
      return wrap(num(totals, 'saltG'));
    case 'kafein':
      return wrap(num(totals, 'caffeineMg'));
    case 'trans_yag':
      return wrap(num(totals, 'transFatG'));
    case 'doymus_yag':
      return wrap(num(totals, 'saturatedFatG'));
    case 'kolesterol':
      return wrap(num(totals, 'cholesterolMg'));
    case 'yag':
      if (unit === 'g') return wrap(num(totals, 'fatG'));
      return { value: null, readiness: 'missing_data' };
    case 'protein':
      return wrap(num(totals, 'proteinG'));
    case 'potasyum':
      return wrap(num(totals, 'potassiumMg'));
    case 'fosfor':
      return wrap(num(totals, 'phosphorusMg'));
    case 'alkol':
      return wrap(num(totals, 'alcoholG'));
    case 'purin':
      return wrap(num(totals, 'purineMg'));
    case 'gluten':
      return wrap(num(totals, 'glutenMg'));
    case 'laktoz':
      return wrap(num(totals, 'lactoseG'));
    case 'su':
    case 'sivi':
      return wrap(num(totals, 'waterL'));
    case 'fodmap':
      return wrap(num(totals, 'fodmapApproxG'));
    case 'cikolata':
      return wrap(num(totals, 'chocolateG'));
    default:
      return { value: null, readiness: 'unsupported' };
  }
}

function wrap(v: number | null): {
  value: number | null;
  readiness: MetricReadiness;
} {
  if (v == null) return { value: null, readiness: 'missing_data' };
  return { value: v, readiness: 'ok' };
}

export function ruleFires(
  operator: string,
  threshold: number,
  value: number,
): boolean {
  switch (operator) {
    case '>':
      return value > threshold;
    case '>=':
      return value >= threshold;
    case '<':
      return value < threshold;
    case 'exists':
      return value > threshold;
    default:
      return false;
  }
}
