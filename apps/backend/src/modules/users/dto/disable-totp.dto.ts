import { IsString, Length, Matches } from "class-validator";

export class DisableTotpDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
