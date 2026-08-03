import { HostingPanel, ManualServiceCategory } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class AssignManualHostingAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  label!: string;

  @IsEnum(ManualServiceCategory)
  serviceCategory!: ManualServiceCategory;

  @IsOptional()
  @IsEnum(HostingPanel)
  panel?: HostingPanel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(45)
  panelIp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  panelUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  panelUsername!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(256)
  panelPassword!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999)
  billingAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  billingCurrency?: string;

  /** Create an OPEN invoice immediately (due in 7 days). */
  @IsOptional()
  @IsBoolean()
  createInvoiceNow?: boolean;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  serverId?: string;
}

export class UpdateManualHostingAccountDto {
  @IsOptional()
  @IsEnum(ManualServiceCategory)
  serviceCategory?: ManualServiceCategory;

  @IsOptional()
  @IsEnum(HostingPanel)
  panel?: HostingPanel;

  @IsOptional()
  @IsString()
  @MaxLength(45)
  panelIp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  panelUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  panelUsername?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  panelPassword?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999)
  billingAmount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  billingCurrency?: string;

  @IsOptional()
  @IsBoolean()
  createInvoiceNow?: boolean;
}
