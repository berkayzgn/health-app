import { Injectable, NotFoundException } from '@nestjs/common';
import { Meal, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';

@Injectable()
export class MealsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, dto: CreateMealDto): Promise<Meal> {
        return this.prisma.meal.create({
            data: {
                userId,
                name: dto.name,
                source: dto.source,
                mealType: dto.mealType,
                portion: dto.portion ?? null,
                calories: dto.calories ?? 0,
                protein: dto.protein ?? 0,
                carbs: dto.carbs ?? 0,
                fat: dto.fat ?? 0,
                date: dto.date ? new Date(dto.date) : new Date(),
            },
        });
    }

    async findAllByUser(
        userId: string,
        dateFrom?: string,
        dateTo?: string,
    ): Promise<Meal[]> {
        const dateFilter: Prisma.DateTimeFilter = {};
        if (dateFrom) dateFilter.gte = new Date(dateFrom);
        if (dateTo) dateFilter.lte = new Date(dateTo);

        return this.prisma.meal.findMany({
            where: {
                userId,
                ...(Object.keys(dateFilter).length > 0
                    ? { date: dateFilter }
                    : {}),
            },
            orderBy: { date: 'desc' },
        });
    }

    async findTodayByUser(userId: string): Promise<{
        meals: Meal[];
        totals: { calories: number; protein: number; carbs: number; fat: number };
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                date: { gte: today, lt: tomorrow },
            },
            orderBy: { date: 'desc' },
        });

        const totals = meals.reduce(
            (acc, meal) => ({
                calories: acc.calories + meal.calories,
                protein: acc.protein + meal.protein,
                carbs: acc.carbs + meal.carbs,
                fat: acc.fat + meal.fat,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        return { meals, totals };
    }

    async findOne(id: string, userId: string): Promise<Meal> {
        const meal = await this.prisma.meal.findFirst({
            where: { id, userId },
        });

        if (!meal) {
            throw new NotFoundException('Yemek bulunamadı');
        }

        return meal;
    }

    async update(
        id: string,
        userId: string,
        dto: UpdateMealDto,
    ): Promise<Meal> {
        await this.findOne(id, userId);

        const data: Prisma.MealUpdateInput = {};
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.source !== undefined) data.source = dto.source;
        if (dto.mealType !== undefined) data.mealType = dto.mealType;
        if (dto.portion !== undefined) data.portion = dto.portion;
        if (dto.calories !== undefined) data.calories = dto.calories;
        if (dto.protein !== undefined) data.protein = dto.protein;
        if (dto.carbs !== undefined) data.carbs = dto.carbs;
        if (dto.fat !== undefined) data.fat = dto.fat;
        if (dto.date !== undefined) data.date = new Date(dto.date);

        return this.prisma.meal.update({
            where: { id },
            data,
        });
    }

    async remove(id: string, userId: string): Promise<void> {
        const result = await this.prisma.meal.deleteMany({
            where: { id, userId },
        });

        if (result.count === 0) {
            throw new NotFoundException('Yemek bulunamadı');
        }
    }
}
