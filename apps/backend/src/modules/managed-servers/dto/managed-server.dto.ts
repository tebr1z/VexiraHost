import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

import { MANAGED_SERVER_FEATURES, MANAGED_SERVER_PACKAGES } from "../managed-server.catalog";

const PACKAGE_CODES = ["CUSTOM", ...MANAGED_SERVER_PACKAGES.map((item) => item.code)] as string[];

export class CreateManagedServerDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsString()
  @Length(1, 255)
  @Matches(/^(?!https?:\/\/)(?!.*\s)[a-zA-Z0-9:._-]+$/, {
    message: "host must be an IP address or hostname without a protocol",
  })
  host!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  sshPort?: number;

  @IsString()
  @Length(1, 64)
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_.-]*$/)
  sshUsername!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 512)
  sshPassword!: string;

  @IsOptional()
  @IsString()
  @IsIn(PACKAGE_CODES)
  packageCode?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MANAGED_SERVER_FEATURES.length)
  @IsIn(MANAGED_SERVER_FEATURES, { each: true })
  selectedFeatures?: string[];
}

export class UpdateManagedServerDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  @Matches(/^(?!https?:\/\/)(?!.*\s)[a-zA-Z0-9:._-]+$/)
  host?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  sshPort?: number;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_.-]*$/)
  sshUsername?: string;

  @IsOptional()
  @IsString()
  @Length(8, 512)
  sshPassword?: string;

  @IsOptional()
  @IsString()
  @IsIn(PACKAGE_CODES)
  packageCode?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MANAGED_SERVER_FEATURES.length)
  @IsIn(MANAGED_SERVER_FEATURES, { each: true })
  selectedFeatures?: string[];

  @IsOptional()
  @IsBoolean()
  monitoringEnabled?: boolean;
}

export class InstallManagedServerDto {
  @IsArray()
  @ArrayMaxSize(MANAGED_SERVER_FEATURES.length)
  @IsIn(MANAGED_SERVER_FEATURES, { each: true })
  features!: string[];

  @IsBoolean()
  confirmChanges!: boolean;
}

export class FixManagedServerFindingDto {
  @IsBoolean()
  confirmChanges!: boolean;
}
