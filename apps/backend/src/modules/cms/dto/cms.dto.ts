import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { CmsSectionType } from "@prisma/client";

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
