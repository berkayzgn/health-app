import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DailyIntakeModule } from '../daily-intake/daily-intake.module';

@Module({
  imports: [DailyIntakeModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
