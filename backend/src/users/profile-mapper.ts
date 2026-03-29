import type { Prisma } from '@prisma/client';

export type ActiveDietVariantResponse = {
  id: string;
  code: string;
  displayNames: Prisma.JsonValue;
  dietTypeCode: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
} | null;

export type ProfileResponseBody = {
  id: string;
  email: string;
  name: string;
  gender: string;
  age: number;
  activityLevel: number;
  goal: string;
  selectedDietTypeCode: string | null;
  dailyCalorieGoal: number;
  macroGoals: Prisma.JsonValue;
  heightCm: string;
  weightKg: string;
  conditionTypes: string[];
  dietaryPreferences: string[];
  activeDietVariant: ActiveDietVariantResponse;
  createdAt: Date;
  updatedAt: Date;
};

export const userProfileInclude = {
  medicalConditions: { include: { condition: true } },
  customHealthTags: true,
  dietPreferences: { include: { dietType: true } },
  activeDietVariant: { include: { dietType: true } },
} satisfies Prisma.UserInclude;

export type UserWithProfileRelations = Prisma.UserGetPayload<{
  include: typeof userProfileInclude;
}>;

export function userToProfileResponse(
  user: UserWithProfileRelations,
): ProfileResponseBody {
  /** Yalnızca medical_conditions (abc.json kataloğu) kodları; özel etiketler API’de listelenmez. */
  const conditionTypes: string[] = user.medicalConditions.map(
    (m) => m.condition.code,
  );
  const dietaryPreferences = user.dietPreferences.map((d) => d.dietType.code);
  const activeDietVariant: ActiveDietVariantResponse = user.activeDietVariant
    ? {
        id: user.activeDietVariant.id,
        code: user.activeDietVariant.code,
        displayNames: user.activeDietVariant.displayNames,
        dietTypeCode: user.activeDietVariant.dietType.code,
        targetCalories: user.activeDietVariant.targetCalories,
        targetProtein: user.activeDietVariant.targetProtein,
        targetCarbs: user.activeDietVariant.targetCarbs,
        targetFat: user.activeDietVariant.targetFat,
      }
    : null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    gender: user.gender,
    age: user.age,
    activityLevel: user.activityLevel,
    goal: user.goal,
    selectedDietTypeCode: user.selectedDietTypeCode,
    dailyCalorieGoal: user.dailyCalorieGoal,
    macroGoals: user.macroGoals,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    conditionTypes,
    dietaryPreferences,
    activeDietVariant,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
