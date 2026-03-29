import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
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
  @IsString()
  gender?: string;

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
  @IsInt()
  @Min(1)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  activityLevel?: number;

  @IsOptional()
  @IsString()
  @IsIn(['lose', 'gain', 'maintain'])
  goal?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  selectedDietTypeCode?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditionTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryPreferences?: string[];
}
