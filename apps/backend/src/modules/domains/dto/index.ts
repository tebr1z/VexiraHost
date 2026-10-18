import { DnsRecordType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class SearchDomainsQueryDto {
  @IsString()
  @MinLength(1)
  q!: string;
}

export class RegisterDomainDto {
  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i, {
    message: "Invalid domain name",
  })
  name!: string;
}

export class TransferDomainDto {
  @IsString()
  @MinLength(6)
  authCode!: string;
}

export class InitiateTransferDto {
  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i, {
    message: "Invalid domain name",
  })
  domainName!: string;

  @IsString()
  @MinLength(6)
  authCode!: string;
}

export class DnsRecordDto {
  @IsEnum(DnsRecordType)
  type!: DnsRecordType;

  @IsString()
  @MaxLength(253)
  name!: string;

  @IsString()
  @MaxLength(4096)
  value!: string;

  @IsInt()
  @Min(60)
  @Max(86400)
  ttl!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(65535)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  proxied?: boolean;
}

export class UpdateDnsRecordsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DnsRecordDto)
  records!: DnsRecordDto[];
}

export class UpdateNameserversDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  nameservers!: string[];
}

export class NsGlueEntryDto {
  @IsString()
  @MinLength(1)
  host!: string;

  @IsOptional()
  @IsString()
  ip?: string;
}

export class UpdateNsGlueDto {
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => NsGlueEntryDto)
  entries!: NsGlueEntryDto[];

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  nameservers!: string[];
}
