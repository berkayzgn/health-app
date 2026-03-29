import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';

/** Mobil uygulama dili — Gemini prompt ve özet metinleri buna göre seçilir */
export type LabelScanLocale = 'tr' | 'en';

export class ScanLabelDto {
  /**
   * Base64-encoded image of the product label (JPEG/PNG).
   * Max ~4 MB raw → ~5.5 MB base64 → we cap at 8 MB string length.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(8_000_000, { message: 'Image too large (max ~4 MB)' })
  imageBase64!: string;

  @IsOptional()
  @IsString()
  @IsIn(['tr', 'en'])
  locale?: LabelScanLocale;
}
