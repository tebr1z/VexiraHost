import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

export class NavLabelsDto {
  @IsString()
  @MinLength(1)
  tr!: string;

  @IsOptional()
  @IsString()
  en?: string;

  @IsOptional()
  @IsString()
  az?: string;

  @IsOptional()
  @IsString()
  ru?: string;
}

export class CreateNavGroupDto {
  @IsString()
  @MinLength(2)
  key!: string;

  @ValidateNested()
  @Type(() => NavLabelsDto)
  labels!: NavLabelsDto;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateNavGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  key?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NavLabelsDto)
  labels?: NavLabelsDto;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateNavItemDto {
  @ValidateNested()
  @Type(() => NavLabelsDto)
  labels!: NavLabelsDto;

  @IsString()
  @MinLength(1)
  href!: string;

  @IsOptional()
  @IsString()
  pathMatch?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateNavItemDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NavLabelsDto)
  labels?: NavLabelsDto;

  @IsOptional()
  @IsString()
  @MinLength(1)
  href?: string;

  @IsOptional()
  @IsString()
  pathMatch?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
