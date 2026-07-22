import { IsIn, IsOptional, IsString } from "class-validator";

import { SUPPORTED_CURRENCIES, SUPPORTED_PERIODS } from "@/shared/pricing/currency.util";

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES])
  preferredCurrency?: string;

  @IsOptional()
  @IsIn([...SUPPORTED_PERIODS])
  billingPeriod?: string;

  /** Used to force AZN lock when client reports Azerbaijan. */
  @IsOptional()
  @IsString()
  countryCode?: string;
}
