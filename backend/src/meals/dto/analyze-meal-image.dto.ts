import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';

export type MealImageLocale = 'tr' | 'en';

export class AnalyzeMealImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8_000_000, { message: 'Image too large (max ~4 MB)' })
  imageBase64!: string;

  @IsOptional()
  @IsString()
  @IsIn(['tr', 'en'])
  locale?: MealImageLocale;
}
