import { BillingCycle, HostingPanel } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
export class CreateHostingPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(HostingPanel)
  panel!: HostingPanel;

  @IsString()
  @MinLength(1)
  serverId!: string;

  @IsInt()
  @Min(1)
  diskGb!: number;

  @IsInt()
  @Min(1)
  bandwidthGb!: number;

  @IsInt()
  @Min(1)
  maxDomains!: number;

  @IsInt()
  @Min(0)
  maxEmails!: number;

  @IsInt()
  @Min(0)
  maxDatabases!: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  pleskPlanName?: string;
}

export class UpdateHostingPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(HostingPanel)
  panel?: HostingPanel;

  @IsOptional()
  @IsString()
  @MinLength(1)
  serverId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  diskGb?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bandwidthGb?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDomains?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxEmails?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDatabases?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  pleskPlanName?: string | null;
}
