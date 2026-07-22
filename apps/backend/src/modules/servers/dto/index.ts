import { IsEnum, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { ServerPowerAction, ServerType } from "@prisma/client";

export class ListPlansQueryDto {
  @IsOptional()
  @IsEnum(ServerType)
  type?: ServerType;
}

export class ProvisionServerDto {
  @IsString()
  planSlug!: string;

  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i, {
    message: "Invalid hostname",
  })
  hostname!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsString()
  region!: string;

  @IsOptional()
  @IsString()
  osTemplate?: string;
}

export class ServerPowerDto {
  @IsEnum(ServerPowerAction)
  action!: ServerPowerAction;
}
