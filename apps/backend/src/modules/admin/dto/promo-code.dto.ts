import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

const PROMO_TYPES = ["PERCENT", "FIXED"] as const;
const CURRENCIES = ["USD", "EUR", "AZN"] as const;
const CATEGORIES = [
  "DOMAIN",
  "HOSTING",
  "VPS",
  "DEDICATED",
  "LICENSE",
  "SSL",
  "EMAIL",
  "BACKUP",
] as const;

export class CreatePromoCodeDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsIn([...PROMO_TYPES])
  type!: (typeof PROMO_TYPES)[number];

  @IsNumber()
  @Min(0)
  value!: number;

  @ValidateIf(
    (o: CreatePromoCodeDto) =>
      o.type === "FIXED" || o.maxDiscountAmount != null || o.minOrderAmount != null,
  )
  @IsIn([...CURRENCIES])
  currency?: (typeof CURRENCIES)[number];

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerUser?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  appliesToAll?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...CATEGORIES], { each: true })
  categories?: (typeof CATEGORIES)[number][];
}

export class UpdatePromoCodeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @IsOptional()
  @IsIn([...PROMO_TYPES])
  type?: (typeof PROMO_TYPES)[number];

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsIn([...CURRENCIES])
  currency?: (typeof CURRENCIES)[number] | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptions?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPerUser?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  appliesToAll?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...CATEGORIES], { each: true })
  categories?: (typeof CATEGORIES)[number][];
}
