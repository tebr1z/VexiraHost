import { IsString, Length, MinLength } from "class-validator";

export class VerifyEmailTwoFactorDto {
  @IsString()
  @MinLength(8)
  challengeId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
