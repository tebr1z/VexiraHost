import { IsIn, IsOptional, IsString } from "class-validator";

import { SUPPORTED_CURRENCIES, SUPPORTED_PERIODS } from "@/shared/pricing/currency.util";

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES])
  preferredCurrency?: string;

  @IsOptional()
  @IsIn([...SUPPORTED_PERIODS])
  billingPeriod?: string;

  /** Optional client geo hint (no longer locks currency). */
  @IsOptional()
  @IsString()
  countryCode?: string;
}
