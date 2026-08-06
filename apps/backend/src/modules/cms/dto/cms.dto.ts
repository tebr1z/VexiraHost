import { CmsSectionType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

export class I18nTextDto {
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

export class CreateCmsPageDto {
  @IsString()
  @MinLength(2)
  slug!: string;

  @ValidateNested()
  @Type(() => I18nTextDto)
  title!: I18nTextDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  parentSlug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  pathSegment?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  /** When set to "license-catalog", default HERO + catalog sections are created. */
  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productSlugs?: string[];
}

export class UpdateCmsPageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  title?: I18nTextDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  parentSlug?: string | null;

  @IsOptional()
  @IsString()
  pathSegment?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateCmsSectionDto {
  @IsString()
  @MinLength(2)
  key!: string;

  @IsEnum(CmsSectionType)
  type!: CmsSectionType;

  @IsObject()
  content!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  design?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCmsSectionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  key?: string;

  @IsOptional()
  @IsEnum(CmsSectionType)
  type?: CmsSectionType;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  design?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderCmsSectionsDto {
  @IsString({ each: true })
  sectionIds!: string[];
}
