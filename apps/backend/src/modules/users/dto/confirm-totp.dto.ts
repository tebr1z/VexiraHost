import { IsString, Length, Matches } from "class-validator";

export class ConfirmTotpDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
