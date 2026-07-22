import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

const INTEGRATION_PROVIDER_VALUES = ["mock", "real", "stripe", "whm"] as const;
const PAYMENT_PROVIDER_VALUES = ["mock", "kapital"] as const;
const KAPITAL_ENVIRONMENT_VALUES = ["test", "production"] as const;

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
  @Transform(({ value }) => {
    if (value === true || value === "true" || value === 1 || value === "1") return true;
    if (value === false || value === "false" || value === 0 || value === "0") return false;
    return value;
  })
  @IsBoolean()
  maintenanceEnabled?: boolean;

  @IsOptional()
  @IsString()
  maintenanceMessage?: string;
}
