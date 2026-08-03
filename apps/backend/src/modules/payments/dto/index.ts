import { PaymentMethodType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class CreatePaymentMethodDto {
  @IsEnum(PaymentMethodType)
  type!: PaymentMethodType;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  last4?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(new Date().getFullYear())
  expiryYear?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class ChargePaymentDto {
  @IsString()
  invoiceId!: string;

  @IsOptional()
  @IsString()
  methodId?: string;

  @IsOptional()
  @IsBoolean()
  useBalance?: boolean;

  /** Optional amount when paying with balance (partial allowed). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;
}
