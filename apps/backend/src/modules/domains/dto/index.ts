import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { DnsRecordType } from "@prisma/client";

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
  name!: string;

  @IsString()
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
}

export class UpdateDnsRecordsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DnsRecordDto)
  records!: DnsRecordDto[];
}
