import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email: email.toLowerCase() }).exec();
    }

    async findById(id: string): Promise<UserDocument | null> {
        return this.userModel.findById(id).exec();
    }

    async create(data: {
        email: string;
        password: string;
        name: string;
    }): Promise<UserDocument> {
        const user = new this.userModel(data);
        return user.save();
    }

    async update(
        id: string,
        data: Partial<{
            name: string;
            dailyCalorieGoal: number;
            macroGoals: { protein: number; carbs: number; fat: number };
        }>,
    ): Promise<UserDocument | null> {
        return this.userModel
            .findByIdAndUpdate(id, { $set: data }, { new: true })
            .exec();
    }
}
