import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

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

  @IsOptional()
  @IsIn([...AUTH_EMAIL_LOCALES])
  locale?: string;
}