import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LabelScanService } from './label-scan.service';
import { ScanLabelDto } from './dto/scan-label.dto';

interface JwtRequest {
  user: { userId: string; email: string };
}

@Controller('label-scan')
@UseGuards(AuthGuard('jwt'))
export class LabelScanController {
  constructor(private readonly labelScanService: LabelScanService) {}

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
    );
  }

  /**
   * POST /label-scan/ocr-preview
   * Yalnızca AWS Textract çıktısı — tam pipeline yok (ilk OCR testi için).
   */
  @Post('ocr-preview')
  async ocrPreview(@Body() dto: ScanLabelDto) {
    return this.labelScanService.previewOcrText(
      dto.imageBase64,
      dto.locale ?? 'tr',
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
}
