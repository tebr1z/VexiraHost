import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

const INTEGRATION_PROVIDER_VALUES = ["mock", "real", "stripe", "whm"] as const;
const PAYMENT_PROVIDER_VALUES = ["mock", "kapital"] as const;
const KAPITAL_ENVIRONMENT_VALUES = ["test", "production"] as const;

function toBoolean({ value }: { value: unknown }) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return value;
}

export class LocalizedTextDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  az?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  tr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  ru?: string;
}

export class SectionBlockDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  blocked?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  message?: LocalizedTextDto;
}

export class UpdateSystemSettingsDto {
  @IsOptional()
  @IsString()
  @IsIn(INTEGRATION_PROVIDER_VALUES)
  registrarProvider?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAYMENT_PROVIDER_VALUES)
  paymentProvider?: string;

  @IsOptional()
  @IsString()
  @IsIn(INTEGRATION_PROVIDER_VALUES)
  hostingProvider?: string;

  @IsOptional()
  @IsString()
  @IsIn(INTEGRATION_PROVIDER_VALUES)
  proxmoxProvider?: string;

  @IsOptional()
  @IsString()
  @IsIn(KAPITAL_ENVIRONMENT_VALUES)
  kapitalEnvironment?: string;

  @IsOptional()
  @IsString()
  kapitalUsername?: string;

  @IsOptional()
  @IsString()
  kapitalPassword?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  maintenanceEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  maintenanceMessage?: LocalizedTextDto;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  announcementEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  announcementTitle?: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  announcementMessage?: LocalizedTextDto;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  loginEnabled?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  registerEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  loginMessage?: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  registerMessage?: LocalizedTextDto;

  @IsOptional()
  @IsObject()
  sectionBlocks?: Record<string, SectionBlockDto>;

  @IsOptional()
  @IsString()
  googleClientId?: string;

  @IsOptional()
  @IsString()
  googleClientSecret?: string;

  @IsOptional()
  @IsString()
  googleCallbackUrl?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  turnstileEnabled?: boolean;

  @IsOptional()
  @IsString()
  turnstileSiteKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  turnstileSecret?: string;

  @IsOptional()
  @IsString()
  turnstileHostnames?: string;
}
