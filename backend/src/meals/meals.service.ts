import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Meal, MealDocument } from './schemas/meal.schema';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';

@Injectable()
export class MealsService {
    constructor(
        @InjectModel(Meal.name) private mealModel: Model<MealDocument>,
    ) { }

    async create(userId: string, dto: CreateMealDto): Promise<MealDocument> {
        const meal = new this.mealModel({
            ...dto,
            userId: new Types.ObjectId(userId),
            date: dto.date ? new Date(dto.date) : new Date(),
        });
        return meal.save();
    }

    async findAllByUser(
        userId: string,
        dateFrom?: string,
        dateTo?: string,
    ): Promise<MealDocument[]> {
        const query: any = { userId: new Types.ObjectId(userId) };

        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) query.date.$gte = new Date(dateFrom);
            if (dateTo) query.date.$lte = new Date(dateTo);
        }

        return this.mealModel.find(query).sort({ date: -1 }).exec();
    }

    async findTodayByUser(userId: string): Promise<{
        meals: MealDocument[];
        totals: { calories: number; protein: number; carbs: number; fat: number };
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const meals = await this.mealModel
            .find({
                userId: new Types.ObjectId(userId),
                date: { $gte: today, $lt: tomorrow },
            })
            .sort({ date: -1 })
            .exec();

        const totals = meals.reduce(
            (acc, meal) => ({
                calories: acc.calories + (meal.calories || 0),
                protein: acc.protein + (meal.protein || 0),
                carbs: acc.carbs + (meal.carbs || 0),
                fat: acc.fat + (meal.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        return { meals, totals };
    }

    async findOne(id: string, userId: string): Promise<MealDocument> {
        const meal = await this.mealModel
            .findOne({ _id: id, userId: new Types.ObjectId(userId) })
            .exec();

        if (!meal) {
            throw new NotFoundException('Yemek bulunamadı');
        }

        return meal;
    }

    async update(
        id: string,
        userId: string,
        dto: UpdateMealDto,
    ): Promise<MealDocument> {
        const meal = await this.mealModel
            .findOneAndUpdate(
                { _id: id, userId: new Types.ObjectId(userId) },
                { $set: dto },
                { new: true },
            )
            .exec();

        if (!meal) {
            throw new NotFoundException('Yemek bulunamadı');
        }

        return meal;
    }

    async remove(id: string, userId: string): Promise<void> {
        const result = await this.mealModel
            .findOneAndDelete({ _id: id, userId: new Types.ObjectId(userId) })
            .exec();

        if (!result) {
            throw new NotFoundException('Yemek bulunamadı');
        }
    }
}
