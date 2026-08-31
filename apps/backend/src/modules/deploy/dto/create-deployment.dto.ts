import { DeployDomainMode, DeployStack } from "@prisma/client";
import {
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateDeploymentDto {
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

  @IsString()
  @MaxLength(500)
  @Matches(/^(https?:\/\/|git@)[^\s]+$/)
  repoUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  branch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rootDirectory?: string;

  @IsOptional()
  @IsObject()
  envVars?: Record<string, string>;
}

export class TriggerDeployDto {
  @IsOptional()
  @IsIn(["create", "redeploy"])
  action?: "create" | "redeploy";
}
