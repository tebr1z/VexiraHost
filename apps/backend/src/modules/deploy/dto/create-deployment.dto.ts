import { DeployDomainMode, DeploySource, DeployStack } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateDeploymentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(48)
  @Matches(/^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/)
  name!: string;

  @IsEnum(DeployStack)
  stack!: DeployStack;

  @IsOptional()
  @IsEnum(DeploySource)
  source?: DeploySource;

  @IsEnum(DeployDomainMode)
  domainMode!: DeployDomainMode;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/)
  subdomain?: string;

  @ValidateIf(
    (dto: CreateDeploymentDto) =>
      (dto.source == null || dto.source === DeploySource.GIT) && !dto.githubRepoFullName?.trim(),
  )
  @IsString()
  @MaxLength(500)
  @Matches(/^(https?:\/\/|git@)[^\s]+$/)
  repoUrl?: string;

  @ValidateIf(
    (dto: CreateDeploymentDto) =>
      (dto.source == null || dto.source === DeploySource.GIT) && !dto.repoUrl?.trim(),
  )
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/)
  githubRepoFullName?: string;

  @ValidateIf((dto: CreateDeploymentDto) => dto.source === DeploySource.DOCKER_IMAGE)
  @IsString()
  @MaxLength(500)
  imageRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  branch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rootDirectory?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  containerPort?: number;

  @IsOptional()
  @IsObject()
  envVars?: Record<string, string>;
}

export class CreateUploadDeploymentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(48)
  @Matches(/^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/)
  name!: string;

  @IsEnum(DeployStack)
  stack!: DeployStack;

  @IsEnum(DeployDomainMode)
  domainMode!: DeployDomainMode;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/)
  subdomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rootDirectory?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  containerPort?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  envVarsJson?: string;
}

export class TriggerDeployDto {
  @IsOptional()
  @IsIn(["create", "redeploy"])
  action?: "create" | "redeploy";
}
