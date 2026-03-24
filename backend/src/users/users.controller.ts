import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { User } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';

function stripPassword(user: User) {
    const { password, ...rest } = user;
    return rest;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    async getProfile(@Req() req: any) {
        const user = await this.usersService.findById(req.user.userId);
        if (!user) return null;
        return stripPassword(user);
    }

    @Patch('me')
    async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
        const user = await this.usersService.update(req.user.userId, body);
        if (!user) return null;
        return stripPassword(user);
    }
}
