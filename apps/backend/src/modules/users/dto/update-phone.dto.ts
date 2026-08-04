import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdatePhoneDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  whatsappNotificationsEnabled?: boolean;
}
