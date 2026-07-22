import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

import { AUTH_EMAIL_LOCALES } from "../email/auth-email.locale";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @IsOptional()
  @IsIn([...AUTH_EMAIL_LOCALES])
  locale?: string;
}
