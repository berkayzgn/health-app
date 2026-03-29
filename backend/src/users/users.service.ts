import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';
import {
  userProfileInclude,
  userToProfileResponse,
  type ProfileResponseBody,
  type UserWithProfileRelations,
} from './profile-mapper';

function splitConditionPayload(conditionTypes: string[]): {
  catalogCodes: string[];
  customLabels: string[];
} {
  const catalogCodes: string[] = [];
  const customLabels: string[] = [];
  for (const raw of conditionTypes) {
    if (!raw || raw === 'none') continue;
    if (raw.startsWith('other:')) {
      const label = raw.slice(6).trim();
      if (label.length) customLabels.push(label);
    } else {
      catalogCodes.push(raw);
    }
  }
  return {
    catalogCodes: [...new Set(catalogCodes)],
    customLabels: [...new Set(customLabels)],
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nutritionService: NutritionService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<UserWithProfileRelations | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: userProfileInclude,
    });
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: data.password,
        name: data.name,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      gender: string;
      dailyCalorieGoal: number;
      macroGoals: { protein: number; carbs: number; fat: number };
      heightCm: string;
      weightKg: string;
      age: number;
      activityLevel: number;
      goal: string;
      selectedDietTypeCode: string | null;
      conditionTypes: string[];
      dietaryPreferences: string[];
    }>,
  ): Promise<ProfileResponseBody | null> {
    const {
      conditionTypes,
      dietaryPreferences,
      ...scalarFields
    } = data;

    const nutritionFieldChanged =
      scalarFields.gender !== undefined ||
      scalarFields.heightCm !== undefined ||
      scalarFields.weightKg !== undefined ||
      scalarFields.age !== undefined ||
      scalarFields.activityLevel !== undefined ||
      scalarFields.goal !== undefined ||
      scalarFields.selectedDietTypeCode !== undefined ||
      dietaryPreferences !== undefined;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (Object.keys(scalarFields).length > 0) {
          const prismaData: Prisma.UserUpdateInput = {};
          if (scalarFields.name !== undefined)
            prismaData.name = scalarFields.name;
          if (scalarFields.dailyCalorieGoal !== undefined)
            prismaData.dailyCalorieGoal = scalarFields.dailyCalorieGoal;
          if (scalarFields.macroGoals !== undefined)
            prismaData.macroGoals = scalarFields.macroGoals as object;
          if (scalarFields.gender !== undefined)
            prismaData.gender = scalarFields.gender;
          if (scalarFields.heightCm !== undefined)
            prismaData.heightCm = scalarFields.heightCm;
          if (scalarFields.weightKg !== undefined)
            prismaData.weightKg = scalarFields.weightKg;
          if (scalarFields.age !== undefined)
            prismaData.age = scalarFields.age;
          if (scalarFields.activityLevel !== undefined)
            prismaData.activityLevel = scalarFields.activityLevel;
          if (scalarFields.goal !== undefined)
            prismaData.goal = scalarFields.goal;
          if (scalarFields.selectedDietTypeCode !== undefined) {
            const raw = scalarFields.selectedDietTypeCode;
            prismaData.selectedDietTypeCode =
              raw === null ||
              (typeof raw === 'string' && raw.trim().length === 0)
                ? null
                : String(raw).trim();
          }

          await tx.user.update({
            where: { id },
            data: prismaData,
          });
        }

        if (conditionTypes !== undefined) {
          await tx.userMedicalCondition.deleteMany({
            where: { userId: id },
          });
          await tx.userCustomHealthTag.deleteMany({
            where: { userId: id },
          });

          const { catalogCodes, customLabels } =
            splitConditionPayload(conditionTypes);

          for (const code of catalogCodes) {
            const cond = await tx.medicalCondition.findUnique({
              where: { code },
            });
            if (cond) {
              await tx.userMedicalCondition.create({
                data: {
                  userId: id,
                  conditionId: cond.id,
                },
              });
            }
          }
          for (const label of customLabels) {
            await tx.userCustomHealthTag.create({
              data: { userId: id, label },
            });
          }
        }

        if (dietaryPreferences !== undefined) {
          await tx.userDietPreference.deleteMany({
            where: { userId: id },
          });
          const uniqueCodes = [...new Set(dietaryPreferences.filter(Boolean))];
          for (const code of uniqueCodes) {
            const dt = await tx.dietType.findUnique({
              where: { code },
            });
            if (dt) {
              await tx.userDietPreference.create({
                data: {
                  userId: id,
                  dietTypeId: dt.id,
                },
              });
            }
          }
          if (scalarFields.selectedDietTypeCode === undefined) {
            let macroCode: string | null = null;
            for (const code of uniqueCodes) {
              const dt = await tx.dietType.findUnique({ where: { code } });
              if (dt?.category === 'macro_plan') {
                macroCode = code;
                break;
              }
            }
            await tx.user.update({
              where: { id },
              data: { selectedDietTypeCode: macroCode },
            });
          }
        }

        const full = await tx.user.findUnique({
          where: { id },
          include: userProfileInclude,
        });
        return full;
      });

      if (!updated) return null;

      if (nutritionFieldChanged) {
        await this.nutritionService.recalculateForUser(id);
        const refreshed = await this.prisma.user.findUnique({
          where: { id },
          include: userProfileInclude,
        });
        if (refreshed) return userToProfileResponse(refreshed);
      }

      return userToProfileResponse(updated);
    } catch {
      return null;
    }
  }

  async removeAccount(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
