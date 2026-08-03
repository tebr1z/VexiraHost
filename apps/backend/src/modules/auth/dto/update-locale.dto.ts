import { IsIn, IsOptional, IsString } from "class-validator";

import { AUTH_EMAIL_LOCALES } from "../email/auth-email.locale";

export class UpdateLocaleDto {
  @IsString()
  @IsIn([...AUTH_EMAIL_LOCALES])
  locale!: string;
}

export class OptionalLocaleDto {
  @IsOptional()
  @IsString()
  @IsIn([...AUTH_EMAIL_LOCALES])
  locale?: string;
}
