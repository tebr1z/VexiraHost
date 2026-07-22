import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { PaymentMethodType } from "@prisma/client";

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
}
