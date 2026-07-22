import { HostingPanel } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateHostingServerDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(3)
  hostname!: string;

  @IsString()
  @MinLength(7)
  ipAddress!: string;

  @IsEnum(HostingPanel)
  panel!: HostingPanel;

  @IsString()
  @MinLength(1)
  whmUsername!: string;

  @IsString()
  @MinLength(4)
  whmPassword!: string;

  @IsOptional()
  @IsString()
  apiToken?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAccounts?: number;
}

export class UpdateHostingServerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  hostname?: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  ipAddress?: string;

  @IsOptional()
  @IsEnum(HostingPanel)
  panel?: HostingPanel;

  @IsOptional()
  @IsString()
  whmUsername?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  whmPassword?: string;

  @IsOptional()
  @IsString()
  apiToken?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAccounts?: number | null;
}
