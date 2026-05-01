import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

export type SummaryLocale = 'tr' | 'en';

/** Porsiyon: tüketim chip’leri (¼, ½, 1, 2) ile hizalı */
export class ConsumeScanDto {
  @Type(() => Number)
  @IsIn([0.25, 0.5, 1, 2])
  portions!: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['tr', 'en'])
  locale?: SummaryLocale;
}
