import { Module } from '@nestjs/common';
import { LabelScanController } from './label-scan.controller';
import { LabelScanService } from './label-scan.service';
import { GeminiVisionService } from './gemini-vision.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DailyIntakeModule } from '../daily-intake/daily-intake.module';

@Module({
  imports: [PrismaModule, DailyIntakeModule],
  controllers: [LabelScanController],
  providers: [GeminiVisionService, LabelScanService],
})
export class LabelScanModule {}
