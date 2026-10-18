import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

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

export class EpointCallbackDto {
  @IsString()
  data!: string;

  @IsString()
  signature!: string;
}
