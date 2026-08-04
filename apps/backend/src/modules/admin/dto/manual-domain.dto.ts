import { DomainChangeStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

import { DnsRecordDto, NsGlueEntryDto } from "@/modules/domains/dto";

export class AssignManualDomainDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  userId?: string;

  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i, {
    message: "Invalid domain name",
  })
  name!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  nameservers?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => NsGlueEntryDto)
  nsGlueEntries?: NsGlueEntryDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extraNameservers?: string[];

  @IsOptional()
  @IsString()
  registrarSource?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DnsRecordDto)
  dnsRecords?: DnsRecordDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  billingAmount?: number;

  @IsOptional()
  @IsString()
  billingCurrency?: string;

  @IsOptional()
  @IsBoolean()
  createInvoiceNow?: boolean;
}

export class UpdateManualDomainDto {
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  nameservers?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => NsGlueEntryDto)
  nsGlueEntries?: NsGlueEntryDto[];

  @IsOptional()
  @IsString()
  registrarSource?: string;

  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  billingAmount?: number | null;

  @IsOptional()
  @IsString()
  billingCurrency?: string;

  @IsOptional()
  @IsBoolean()
  createInvoiceNow?: boolean;
}

export class UpdateDomainChangeStatusDto {
  @IsEnum(DomainChangeStatus)
  status!: DomainChangeStatus;
}

export class ListDomainChangesQueryDto {
  @IsOptional()
  @IsEnum(DomainChangeStatus)
  status?: DomainChangeStatus;
}

export class AdminCreditBalanceDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
