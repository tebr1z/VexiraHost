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
  Max,
  MinLength,
} from "class-validator";

export class CreateHostingPlanDto {
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3200)
  autoDeployCpuPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(128)
  @Max(262144)
  autoDeployMemoryMb?: number;
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

  @IsOptional()
  @IsBoolean()
  autoDeployEnabled?: boolean;

  @IsOptional()
  @IsString()
  autoDeployServerId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoDeployDiskGb?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoDeployMaxApps?: number;

  @IsOptional()
  @IsBoolean()
  autoDeployAiEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  autoDeployAiMonthlyCredits?: number;

  @IsOptional()
  @IsBoolean()
  autoDeploySecurityScanEnabled?: boolean;
}

export class UpdateHostingPlanDto {
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3200)
  autoDeployCpuPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(128)
  @Max(262144)
  autoDeployMemoryMb?: number;
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

  @IsOptional()
  @IsBoolean()
  autoDeployEnabled?: boolean;

  @IsOptional()
  @IsString()
  autoDeployServerId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoDeployDiskGb?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoDeployMaxApps?: number;

  @IsOptional()
  @IsBoolean()
  autoDeployAiEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  autoDeployAiMonthlyCredits?: number;

  @IsOptional()
  @IsBoolean()
  autoDeploySecurityScanEnabled?: boolean;
}
