import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true, lowercase: true, trim: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ default: 2000 })
    dailyCalorieGoal: number;

    @Prop(
        raw({
            protein: { type: Number, default: 120 },
            carbs: { type: Number, default: 200 },
            fat: { type: Number, default: 65 },
        }),
    )
    macroGoals: Record<string, number>;
}

export const UserSchema = SchemaFactory.createForClass(User);
