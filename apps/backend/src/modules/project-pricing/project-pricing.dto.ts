import { PROJECT_FEATURE_KEYS, PROJECT_PACKAGE_KEYS } from "@vexira/types";
import type { ProjectFeature, ProjectPackage, ProjectPricingConfig } from "@vexira/types";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class ProjectDiscountDto {
  @IsIn(["none", "percent", "amount"]) type!: "none" | "percent" | "amount";
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) value!: number;
}
export class ProjectPackagePriceDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) price!: number;
  @IsDefined() @ValidateNested() @Type(() => ProjectDiscountDto) discount!: ProjectDiscountDto;
  @IsInt() @Min(1) @Max(30) pages!: number;
  @IsInt() @Min(0) @Max(36) supportMonths!: number;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(5)
  @IsIn(PROJECT_FEATURE_KEYS, { each: true })
  included!: ProjectFeature[];
}
export class ProjectPackagesDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ProjectPackagePriceDto)
  landing!: ProjectPackagePriceDto;
  @IsDefined()
  @ValidateNested()
  @Type(() => ProjectPackagePriceDto)
  company!: ProjectPackagePriceDto;
  @IsDefined() @ValidateNested() @Type(() => ProjectPackagePriceDto) store!: ProjectPackagePriceDto;
  @IsDefined()
  @ValidateNested()
  @Type(() => ProjectPackagePriceDto)
  platform!: ProjectPackagePriceDto;
  @IsDefined()
  @ValidateNested()
  @Type(() => ProjectPackagePriceDto)
  mobile!: ProjectPackagePriceDto;
  @IsDefined()
  @ValidateNested()
  @Type(() => ProjectPackagePriceDto)
  desktop!: ProjectPackagePriceDto;
}
export class ProjectFeaturesDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) cms!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) booking!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) payments!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) account!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) api!: number;
}
export class ProjectGiftsDto {
  @IsInt() @Min(0) @Max(36) domainMonths!: number;
  @IsInt() @Min(0) @Max(36) hostingMonths!: number;
}
export class ProjectPricingConfigDto implements ProjectPricingConfig {
  @IsIn([1]) schemaVersion!: 1;
  @IsIn(["AZN"]) currency!: "AZN";
  @IsDefined() @ValidateNested() @Type(() => ProjectPackagesDto) packages!: ProjectPackagesDto;
  @IsDefined() @ValidateNested() @Type(() => ProjectFeaturesDto) features!: ProjectFeaturesDto;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) extraPagePrice!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) extraLanguagePrice!: number;
  @IsDefined() @ValidateNested() @Type(() => ProjectGiftsDto) gifts!: ProjectGiftsDto;
}
export class SaveProjectPricingDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ProjectPricingConfigDto)
  config!: ProjectPricingConfigDto;
  @IsOptional() @IsDateString() expectedUpdatedAt!: string | null;
}
export class ProjectQuoteRequestDto {
  @IsIn(PROJECT_PACKAGE_KEYS) package!: ProjectPackage;
  @IsInt() @Min(1) @Max(30) pages!: number;
  @IsInt() @Min(1) @Max(6) languages!: number;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(5)
  @IsIn(PROJECT_FEATURE_KEYS, { each: true })
  features!: ProjectFeature[];
  @IsOptional() @IsDateString() pricingUpdatedAt!: string | null;
}
