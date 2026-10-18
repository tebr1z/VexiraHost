import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class UpdateHostingAccountStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";
}

export class ResolveHostingCancelRequestDto {
  @IsIn(["approve", "deactivate", "delete", "reject"])
  action!: "approve" | "deactivate" | "delete" | "reject";
}

export class MigrateHostingAccountsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  accountIds!: string[];

  @IsString()
  targetServerId!: string;
}

export class UpdateHostingAutoDeployLimitsDto {
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3200)
  autoDeployCpuPercentOverride?: number | null;

  @IsOptional()
  @IsInt()
  @Min(128)
  @Max(262144)
  autoDeployMemoryMbOverride?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoDeployDiskGbOverride?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoDeployMaxAppsOverride?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  autoDeployAiCreditsOverride?: number | null;
}
