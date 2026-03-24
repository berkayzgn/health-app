import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async create(data: {
        email: string;
        password: string;
        name: string;
    }): Promise<User> {
        return this.prisma.user.create({
            data: {
                email: data.email.toLowerCase(),
                password: data.password,
                name: data.name,
                conditionTypes: ['none'],
            },
        });
    }

    async update(
        id: string,
        data: Partial<{
            name: string;
            dailyCalorieGoal: number;
            macroGoals: { protein: number; carbs: number; fat: number };
            heightCm: string;
            weightKg: string;
            conditionTypes: string[];
            dietaryPreferences: string[];
        }>,
    ): Promise<User | null> {
        try {
            return await this.prisma.user.update({
                where: { id },
                data,
            });
        } catch {
            return null;
        }
    }
}
