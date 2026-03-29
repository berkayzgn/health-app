import { Module } from '@nestjs/common';
import { LabelScanController } from './label-scan.controller';
import { LabelScanService } from './label-scan.service';
import { GeminiVisionService } from './gemini-vision.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LabelScanController],
  providers: [GeminiVisionService, LabelScanService],
})
export class LabelScanModule {}
