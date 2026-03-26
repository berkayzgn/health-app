import type { ProfileResponse } from '../services/authService';
import type { DayNutritionTotals } from '../services/mealsService';

const DEFAULT_MACROS = { protein: 120, carbs: 200, fat: 65 };

function parseMacroGoals(raw: ProfileResponse['macroGoals']) {
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
        const o = raw as Record<string, unknown>;
        return {
            protein: Number(o.protein) || DEFAULT_MACROS.protein,
            carbs: Number(o.carbs) || DEFAULT_MACROS.carbs,
            fat: Number(o.fat) || DEFAULT_MACROS.fat,
        };
    }
    return { ...DEFAULT_MACROS };
}

export type NutritionDashboardView = {
    kcalConsumed: number;
    kcalGoal: number;
    kcalProgress: number;
    protein: number;
    proteinTarget: number;
    proteinBarPct: number;
    proteinRemain: number;
    carbs: number;
    carbTarget: number;
    carbBarPct: number;
    carbRemain: number;
    fats: number;
    fatTarget: number;
    fatBarPct: number;
    fatRemain: number;
};

export function buildNutritionDashboard(
    profile: ProfileResponse | null,
    totals: DayNutritionTotals,
): NutritionDashboardView {
    const kcalGoal = profile?.dailyCalorieGoal ?? 2000;
    const macros = parseMacroGoals(profile?.macroGoals);
    const kcalConsumed = totals.calories;
    const kcalProgress = kcalGoal > 0 ? Math.min(1, kcalConsumed / kcalGoal) : 0;

    const protein = totals.protein;
    const proteinTarget = macros.protein;
    const proteinRatio = proteinTarget > 0 ? protein / proteinTarget : 0;

    const carbs = totals.carbs;
    const carbTarget = macros.carbs;
    const carbRatio = carbTarget > 0 ? carbs / carbTarget : 0;

    const fats = totals.fat;
    const fatTarget = macros.fat;
    const fatRatio = fatTarget > 0 ? fats / fatTarget : 0;

    return {
        kcalConsumed,
        kcalGoal,
        kcalProgress,
        protein,
        proteinTarget,
        proteinBarPct: Math.min(1, proteinRatio),
        proteinRemain: Math.max(0, proteinTarget - protein),
        carbs,
        carbTarget,
        carbBarPct: Math.min(1, carbRatio),
        carbRemain: Math.max(0, carbTarget - carbs),
        fats,
        fatTarget,
        fatBarPct: Math.min(1, fatRatio),
        fatRemain: Math.max(0, fatTarget - fats),
    };
}
