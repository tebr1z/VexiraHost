import { IsIn, IsOptional, IsString } from "class-validator";

import { SITE_AUTH_LOCALES } from "../email/auth-email.locale";

export class UpdateLocaleDto {
  @IsString()
  @IsIn([...SITE_AUTH_LOCALES])
  locale!: string;
}

export class OptionalLocaleDto {
  @IsOptional()
  @IsString()
  @IsIn([...SITE_AUTH_LOCALES])
  locale?: string;
}
