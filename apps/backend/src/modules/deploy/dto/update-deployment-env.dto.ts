import { IsBoolean, IsObject, IsOptional } from "class-validator";

export class UpdateDeploymentEnvDto {
  @IsObject()
  envVars!: Record<string, string>;

  /** Full rebuild (required for NEXT_PUBLIC_* changes). Default: restart container only. */
  @IsOptional()
  @IsBoolean()
  redeploy?: boolean;
}
