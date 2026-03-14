import { api } from './api';

export interface MealResponse {
    _id: string;
    userId: string;
    name: string;
    source: 'scan' | 'manual';
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    portion?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: string;
    createdAt: string;
    updatedAt: string;
}

export interface TodayMealsResponse {
    meals: MealResponse[];
    totals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
}

export interface CreateMealInput {
    name: string;
    source: 'scan' | 'manual';
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    portion?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    date?: string;
}

export async function createMeal(data: CreateMealInput): Promise<MealResponse> {
    return api.post<MealResponse>('/meals', data);
}

export async function getMeals(
    dateFrom?: string,
    dateTo?: string,
): Promise<MealResponse[]> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const query = params.toString();
    return api.get<MealResponse[]>(`/meals${query ? `?${query}` : ''}`);
}

export async function getTodayMeals(): Promise<TodayMealsResponse> {
    return api.get<TodayMealsResponse>('/meals/today');
}

export async function getMealById(id: string): Promise<MealResponse> {
    return api.get<MealResponse>(`/meals/${id}`);
}

export async function updateMeal(
    id: string,
    data: Partial<CreateMealInput>,
): Promise<MealResponse> {
    return api.patch<MealResponse>(`/meals/${id}`, data);
}

export async function deleteMeal(id: string): Promise<void> {
    return api.delete<void>(`/meals/${id}`);
}
