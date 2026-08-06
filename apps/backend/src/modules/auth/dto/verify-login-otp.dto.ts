import { IsOptional, IsString, Length, MinLength } from "class-validator";

export class VerifyLoginOtpDto {
  @IsString()
  @MinLength(8)
  challengeId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
