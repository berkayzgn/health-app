import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateNutritionTargets,
  type Goal,
  type MacroRatios,
  type NutritionTargets,
  type UserMetrics,
} from './nutrition.calculator';

@Injectable()
export class NutritionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Re-calculates and persists calorie/macro targets for a user
   * based on their body metrics and selected macro plan.
   *
   * Returns null if the user has no valid macro plan selected
   * or body data is incomplete.
   */
  async recalculateForUser(userId: string): Promise<NutritionTargets | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return null;

    const weight = parseFloat(user.weightKg);
    const height = parseFloat(user.heightCm);
    if (!weight || !height || !user.age || !user.gender) return null;

    if (!user.selectedDietTypeCode) return null;

    const dietType = await this.prisma.dietType.findUnique({
      where: { code: user.selectedDietTypeCode },
    });
    if (!dietType || dietType.category !== 'macro_plan') return null;

    const macros = dietType.macros as unknown as MacroRatios;
    if (!macros?.proteinRatio) return null;

    const metrics: UserMetrics = {
      gender: user.gender as 'male' | 'female',
      weight,
      height,
      age: user.age,
      activity: user.activityLevel,
    };

    const targets = calculateNutritionTargets(
      metrics,
      macros,
      user.goal as Goal,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        dailyCalorieGoal: targets.calories,
        macroGoals: {
          protein: targets.protein_g,
          carbs: targets.carb_g,
          fat: targets.fat_g,
        },
      },
    });

    return targets;
  }
}
