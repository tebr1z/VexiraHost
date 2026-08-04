import { BillingCycle, HostingDistributionMode, HostingPanel } from "@prisma/client";
import {
  ArrayMinSize,
  IsArray,
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

  /** Primary server (also first in serverIds when omitted). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  serverId?: string;

  /** One or more servers for failover / load balancing. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serverIds?: string[];

  @IsOptional()
  @IsEnum(HostingDistributionMode)
  distributionMode?: HostingDistributionMode;

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
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serverIds?: string[];

  @IsOptional()
  @IsEnum(HostingDistributionMode)
  distributionMode?: HostingDistributionMode;

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
