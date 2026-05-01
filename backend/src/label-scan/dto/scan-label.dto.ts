import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';

/** Mobil uygulama dili — Gemini prompt ve özet metinleri buna göre seçilir */
export type LabelScanLocale = 'tr' | 'en';

/**
 * `label` — ambalaj / besin değerleri / içindekiler etiketi (OCR odaklı).
 * `meal` — tabak, yemek veya etiketsiz ürün fotoğrafı (görsel çıkarım + konservatif alerjen tahmini).
 * `auto` — görüntüde okunabilir etiket metni varsa OCR; yoksa yemek fotoğrafı olarak yorumla.
 */
export type ScanImageKind = 'label' | 'meal' | 'auto';

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

  @IsOptional()
  @IsString()
  @IsIn(['label', 'meal', 'auto'])
  scanKind?: ScanImageKind;
}
