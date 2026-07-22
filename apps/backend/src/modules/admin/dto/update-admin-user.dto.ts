import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { SUPPORTED_CURRENCIES, SUPPORTED_PERIODS } from "@/shared/pricing/currency.util";

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsIn(["admin", "staff", "customer"])
  role?: "admin" | "staff" | "customer";

  @IsOptional()
  @IsIn(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED"])
  status?: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";

  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES])
  preferredCurrency?: string;

  @IsOptional()
  @IsIn([...SUPPORTED_PERIODS])
  billingPeriod?: string;

  @IsOptional()
  @IsBoolean()
  currencyLocked?: boolean;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
