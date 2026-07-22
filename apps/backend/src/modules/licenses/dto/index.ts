import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { AddonServiceType } from "@prisma/client";

export class ProvisionAddonDto {
  @IsEnum(AddonServiceType)
  type!: AddonServiceType;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  identifier?: string;
}
