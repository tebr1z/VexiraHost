import { BillingCycle, ServerType } from "@prisma/client";
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

export class CreateServerPlanDto {
  @IsString()
  @MinLength(2)
  slug!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ServerType)
  type!: ServerType;

  @IsInt()
  @Min(1)
  cpuCores!: number;

  @IsInt()
  @Min(1)
  ramGb!: number;

  @IsInt()
  @Min(1)
  diskGb!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bandwidthGbps?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  regions?: string[];

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
}

export class UpdateServerPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(ServerType)
  type?: ServerType;

  @IsOptional()
  @IsInt()
  @Min(1)
  cpuCores?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  ramGb?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  diskGb?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bandwidthGbps?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  regions?: string[];

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
}
