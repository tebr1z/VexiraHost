import {
  BillingCycle,
  DigitalDeliveryMode,
  PriceCurrency,
  PricePeriod,
  ProductCategory,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class ProductPriceDto {
  @IsEnum(PriceCurrency)
  currency!: PriceCurrency;

  @IsEnum(PricePeriod)
  period!: PricePeriod;

  @IsNumber()
  @Min(0)
  originalPrice!: number;

  @IsNumber()
  @Min(0)
  salePrice!: number;
}

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @IsOptional()
  @IsString()
  catalogCategoryId?: string | null;

  @IsOptional()
  @IsString()
  hostingPlanSlug?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceDto)
  prices?: ProductPriceDto[];

  @IsOptional()
  @IsEnum(DigitalDeliveryMode)
  deliveryMode?: DigitalDeliveryMode;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsString()
  licenseKeys?: string | null;

  @IsOptional()
  @IsString()
  downloadUrl?: string | null;

  @IsOptional()
  @IsString()
  downloadFileName?: string | null;

  @IsOptional()
  @IsString()
  promoText?: string | null;

  @IsOptional()
  @IsString()
  activationGuideText?: string | null;

  @IsOptional()
  @IsString()
  activationGuideImageUrl?: string | null;

  @IsOptional()
  @IsString()
  activationGuideVideoUrl?: string | null;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsString()
  catalogCategoryId?: string | null;

  @IsOptional()
  @IsString()
  hostingPlanSlug?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceDto)
  prices?: ProductPriceDto[];

  @IsOptional()
  @IsEnum(DigitalDeliveryMode)
  deliveryMode?: DigitalDeliveryMode;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsString()
  licenseKeys?: string | null;

  @IsOptional()
  @IsString()
  downloadUrl?: string | null;

  @IsOptional()
  @IsString()
  downloadFileName?: string | null;

  @IsOptional()
  @IsString()
  promoText?: string | null;

  @IsOptional()
  @IsString()
  activationGuideText?: string | null;

  @IsOptional()
  @IsString()
  activationGuideImageUrl?: string | null;

  @IsOptional()
  @IsString()
  activationGuideVideoUrl?: string | null;
}
