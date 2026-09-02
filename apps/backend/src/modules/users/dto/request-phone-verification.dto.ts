import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class RequestPhoneVerificationDto {
  @IsString()
  @MinLength(8)
  phone!: string;

  @IsOptional()
  @IsBoolean()
  whatsappNotificationsEnabled?: boolean;
}
