import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MealDocument = Meal & Document;

@Schema({ timestamps: true })
export class Meal {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ required: true, enum: ['scan', 'manual'] })
    source: string;

    @Prop({ required: true, enum: ['breakfast', 'lunch', 'dinner', 'snack'] })
    mealType: string;

    @Prop({ trim: true })
    portion: string;

    @Prop({ default: 0 })
    calories: number;

    @Prop({ default: 0 })
    protein: number;

    @Prop({ default: 0 })
    carbs: number;

    @Prop({ default: 0 })
    fat: number;

    @Prop({ default: () => new Date() })
    date: Date;
}

export const MealSchema = SchemaFactory.createForClass(Meal);
