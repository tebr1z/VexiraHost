import { ProductCategory } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateCatalogCategoryDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  names?: Record<string, string> | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(ProductCategory)
  systemType?: ProductCategory | null;
}

export class UpdateCatalogCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  names?: Record<string, string> | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(ProductCategory)
  systemType?: ProductCategory | null;
}
