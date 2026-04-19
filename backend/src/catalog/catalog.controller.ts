import { Controller, Get } from '@nestjs/common';
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
}
