import { IsBoolean, IsOptional } from "class-validator";

export class UpdatePhoneDto {
  @IsOptional()
  @IsBoolean()
  whatsappNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  removePhone?: boolean;
}
