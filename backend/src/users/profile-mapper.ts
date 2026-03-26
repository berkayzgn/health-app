import type { Prisma } from '@prisma/client';

/** GET / PATCH yanıtı — mobil uygulama mevcut string[] sözleşmesini kullanmaya devam eder. */
export type ProfileResponseBody = {
  id: string;
  email: string;
  name: string;
  dailyCalorieGoal: number;
  macroGoals: Prisma.JsonValue;
  heightCm: string;
  weightKg: string;
  conditionTypes: string[];
  dietaryPreferences: string[];
  createdAt: Date;
  updatedAt: Date;
};

export const userProfileInclude = {
  medicalConditions: { include: { condition: true } },
  customHealthTags: true,
  dietPreferences: { include: { dietType: true } },
} satisfies Prisma.UserInclude;

export type UserWithProfileRelations = Prisma.UserGetPayload<{
  include: typeof userProfileInclude;
}>;

export function userToProfileResponse(
  user: UserWithProfileRelations,
): ProfileResponseBody {
  const conditionTypes: string[] = [
    ...user.medicalConditions.map((m) => m.condition.code),
    ...user.customHealthTags.map((t) => `other:${t.label}`),
  ];
  const dietaryPreferences = user.dietPreferences.map((d) => d.dietType.code);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    dailyCalorieGoal: user.dailyCalorieGoal,
    macroGoals: user.macroGoals,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    conditionTypes,
    dietaryPreferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
