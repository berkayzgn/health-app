import { Type } from 'class-transformer';
import {
    IsArray,
    IsInt,
    IsOptional,
    IsString,
    Min,
    MinLength,
    ValidateNested,
} from 'class-validator';

class MacroGoalsDto {
    @IsInt()
    @Min(0)
    protein: number;

    @IsInt()
    @Min(0)
    carbs: number;

    @IsInt()
    @Min(0)
    fat: number;
}

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    name?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    dailyCalorieGoal?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => MacroGoalsDto)
    macroGoals?: MacroGoalsDto;

    @IsOptional()
    @IsString()
    heightCm?: string;

    @IsOptional()
    @IsString()
    weightKg?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    conditionTypes?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    dietaryPreferences?: string[];
}
