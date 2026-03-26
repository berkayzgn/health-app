import { api } from './api';

export interface DayNutritionTotals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface MealRecord {
    id: string;
    name: string;
    source: string;
    mealType: string;
    portion?: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: string;
}

export interface TodayMealsResponse {
    meals: MealRecord[];
    totals: DayNutritionTotals;
}

export async function getTodayMeals(): Promise<TodayMealsResponse> {
    return api.get<TodayMealsResponse>('/meals/today');
}

export type MealTypeId = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'midSnack';

export interface CreateMealInput {
    name: string;
    source: 'manual' | 'scan';
    mealType: MealTypeId;
    portion?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    date?: string;
}

export async function createMeal(body: CreateMealInput): Promise<MealRecord> {
    return api.post<MealRecord>('/meals', body);
}
