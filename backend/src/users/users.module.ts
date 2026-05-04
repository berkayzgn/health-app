import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ScanQuotaService } from './scan-quota.service';
import { DailyIntakeModule } from '../daily-intake/daily-intake.module';

@Module({
  imports: [DailyIntakeModule],
  controllers: [UsersController],
  providers: [UsersService, ScanQuotaService],
  exports: [UsersService, ScanQuotaService],
})
export class UsersModule {}
