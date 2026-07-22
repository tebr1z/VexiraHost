import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

import { SUPPORTED_CURRENCIES, SUPPORTED_PERIODS } from "@/shared/pricing/currency.util";

export class CheckoutItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES])
  currency?: string;

  @IsOptional()
  @IsIn([...SUPPORTED_PERIODS])
  period?: string;
}
