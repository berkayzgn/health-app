import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LabelScanService } from './label-scan.service';
import { ScanLabelDto } from './dto/scan-label.dto';
import { ConsumeScanDto } from './dto/consume-scan.dto';
import { DailyIntakeService } from '../daily-intake/daily-intake.service';

interface JwtRequest {
  user: { userId: string; email: string };
}

@Controller('label-scan')
@UseGuards(AuthGuard('jwt'))
export class LabelScanController {
  constructor(
    private readonly labelScanService: LabelScanService,
    private readonly dailyIntake: DailyIntakeService,
  ) {}

  /**
   * POST /label-scan
   * Body: { imageBase64: string }
   * Returns the full scan result including ingredient breakdown and safety label.
   */
  @Post()
  async scan(@Request() req: JwtRequest, @Body() dto: ScanLabelDto) {
    return this.labelScanService.scanLabel(
      req.user.userId,
      dto.imageBase64,
      dto.locale ?? 'tr',
      dto.scanKind ?? 'label',
    );
  }

  /**
   * GET /label-scan/history?limit=20
   * Returns the authenticated user's past scan records.
   */
  @Get('history')
  async history(
    @Request() req: JwtRequest,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.labelScanService.getScanHistory(req.user.userId, limit);
  }

  @Post('history/:id/consume')
  async markConsumed(
    @Request() req: JwtRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ConsumeScanDto,
  ) {
    const tz = dto.timezone?.trim() ? dto.timezone.trim() : 'Europe/Istanbul';
    const locale = dto.locale === 'en' ? 'en' : 'tr';
    return this.dailyIntake.setScanConsumed(
      req.user.userId,
      id,
      dto.portions,
      tz,
      locale,
    );
  }

  @Delete('history/:id/consume')
  async clearConsumed(
    @Request() req: JwtRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.dailyIntake.clearScanConsumed(req.user.userId, id);
    return { ok: true };
  }

  /**
   * GET /label-scan/history/:id
   * Tek tarama detayı (JWT kullanıcısına ait olmalı).
   */
  @Get('history/:id')
  async historyItem(
    @Request() req: JwtRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const item = await this.labelScanService.getScanById(req.user.userId, id);
    if (!item) {
      throw new NotFoundException('Scan not found');
    }
    return item;
  }
}
