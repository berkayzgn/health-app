import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    async getProfile(@Req() req: any) {
        const user = await this.usersService.findById(req.user.userId);
        if (!user) return null;

        const { password, ...result } = user.toObject();
        return result;
    }

    @Patch('me')
    async updateProfile(
        @Req() req: any,
        @Body()
        body: {
            name?: string;
            dailyCalorieGoal?: number;
            macroGoals?: { protein: number; carbs: number; fat: number };
        },
    ) {
        const user = await this.usersService.update(req.user.userId, body);
        if (!user) return null;

        const { password, ...result } = user.toObject();
        return result;
    }
}
