import { IsOptional, IsString, MinLength } from "class-validator";

export class ResendLoginOtpDto {
  @IsString()
  @MinLength(8)
  challengeId!: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
