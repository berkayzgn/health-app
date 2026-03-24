import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    Min,
    IsDateString,
} from 'class-validator';

export class UpdateMealDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsEnum(['scan', 'manual'])
    source?: string;

    @IsOptional()
    @IsEnum(['breakfast', 'lunch', 'dinner', 'snack', 'midSnack'])
    mealType?: string;

    @IsOptional()
    @IsString()
    portion?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    calories?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    protein?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    carbs?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    fat?: number;

    @IsOptional()
    @IsDateString()
    date?: string;
}
