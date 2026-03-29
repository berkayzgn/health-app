import { Module } from '@nestjs/common';
import { MealsService } from './meals.service';
import { MealsController } from './meals.controller';
import { GeminiMealImageService } from './gemini-meal-image.service';

@Module({
    controllers: [MealsController],
    providers: [MealsService, GeminiMealImageService],
    exports: [MealsService],
})
export class MealsModule { }
