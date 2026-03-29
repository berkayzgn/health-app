export interface UserMetrics {
  gender: 'male' | 'female';
  weight: number;   // kg
  height: number;   // cm
  age: number;
  activity: number; // multiplier: 1.2 | 1.375 | 1.55 | 1.725 | 1.9
}

export interface MacroRatios {
  proteinRatio: number; // e.g. 0.30
  carbRatio: number;
  fatRatio: number;
}

export type Goal = 'lose' | 'gain' | 'maintain';

export interface NutritionTargets {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

const GOAL_OFFSET: Record<Goal, number> = {
  lose: -300,
  gain: 300,
  maintain: 0,
};

function calculateBMR(m: UserMetrics): number {
  const base = 10 * m.weight + 6.25 * m.height - 5 * m.age;
  return m.gender === 'male' ? base + 5 : base - 161;
}

export function calculateNutritionTargets(
  user: UserMetrics,
  macros: MacroRatios,
  goal: Goal = 'maintain',
): NutritionTargets {
  const bmr = calculateBMR(user);
  const tdee = bmr * user.activity;
  const calories = Math.round(tdee + GOAL_OFFSET[goal]);

  return {
    calories,
    protein_g: Math.round((calories * macros.proteinRatio) / 4),
    carb_g: Math.round((calories * macros.carbRatio) / 4),
    fat_g: Math.round((calories * macros.fatRatio) / 9),
  };
}
