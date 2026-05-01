import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DailyIntakeService } from './daily-intake.service';

@Module({
  imports: [PrismaModule],
  providers: [DailyIntakeService],
  exports: [DailyIntakeService],
})
export class DailyIntakeModule {}
