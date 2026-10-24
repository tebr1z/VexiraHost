import { IsBoolean, IsObject, IsOptional } from "class-validator";

export class UpdateDeploymentEnvDto {
  @IsObject()
  envVars!: Record<string, string>;

  /** Explicit replacement after a key change; old ciphertext is otherwise preserved. */
  @IsOptional()
  @IsBoolean()
  replaceUnreadableEnv?: boolean;

  /** Full rebuild (required for NEXT_PUBLIC_* changes). Default: restart container only. */
  @IsOptional()
  @IsBoolean()
  redeploy?: boolean;
}
