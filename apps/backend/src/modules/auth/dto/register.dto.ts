import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { AUTH_EMAIL_LOCALES } from "../email/auth-email.locale";

import { SUPPORTED_CURRENCIES } from "@/shared/pricing/currency.util";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES])
  preferredCurrency?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  /** Optional E.164 digits without + (e.g. 994501234567) */
  @IsOptional()
  @IsString()
  @MinLength(8)
  phone?: string;

  @IsOptional()
  @IsIn([...AUTH_EMAIL_LOCALES])
  locale?: string;

  /** Default true — campaign / promo email subscription */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return true;
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    return Boolean(value);
  })
  @IsBoolean()
  marketingOptIn?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}
