import { IsOptional, IsString, MinLength } from "class-validator";

export class DeliverLicenseDto {
  @IsString()
  @MinLength(1)
  orderItemId!: string;

  @IsString()
  @MinLength(2)
  licenseKey!: string;

  @IsOptional()
  @IsString()
  downloadUrl?: string;
}
