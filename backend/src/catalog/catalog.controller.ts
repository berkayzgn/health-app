import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('medical-conditions')
  async getMedicalConditions() {
    return this.prisma.medicalCondition.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        kind: true,
        displayNames: true,
        triggerFoods: true,
        sortOrder: true,
      },
    });
  }

  @Get('diet-types')
  async getDietTypes() {
    return this.prisma.dietType.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        displayNames: true,
        category: true,
        macros: true,
        sortOrder: true,
        variants: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            code: true,
            displayNames: true,
            gender: true,
            bmiMin: true,
            bmiMax: true,
            targetCalories: true,
            targetProtein: true,
            targetCarbs: true,
            targetFat: true,
            sortOrder: true,
          },
        },
      },
    });
  }

  @Get('macro-plans')
  async getMacroPlans() {
    return this.prisma.dietType.findMany({
      where: { category: 'macro_plan' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        displayNames: true,
        macros: true,
        sortOrder: true,
      },
    });
  }

  @Get('diet-types/:code/variants')
  async getDietVariants(@Param('code') code: string) {
    return this.prisma.dietVariant.findMany({
      where: { dietType: { code } },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        displayNames: true,
        gender: true,
        bmiMin: true,
        bmiMax: true,
        targetCalories: true,
        targetProtein: true,
        targetCarbs: true,
        targetFat: true,
        sortOrder: true,
        meta: true,
      },
    });
  }
}
