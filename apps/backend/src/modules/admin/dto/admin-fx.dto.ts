import { Type } from "class-transformer";
import { IsNumber, IsString, Min } from "class-validator";

export class AdminFxConvertDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  from!: string;

  @IsString()
  to!: string;
}
