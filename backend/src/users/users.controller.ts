import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { userToProfileResponse } from './profile-mapper';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: { user: { userId: string } }) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) return null;
    return userToProfileResponse(user);
  }

  @Patch('me')
  async updateProfile(
    @Req() req: { user: { userId: string } },
    @Body() body: UpdateProfileDto,
  ) {
    return this.usersService.update(req.user.userId, body);
  }
}
