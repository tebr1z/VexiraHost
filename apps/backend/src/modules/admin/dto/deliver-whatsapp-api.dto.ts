import { IsString, MinLength } from "class-validator";

export class DeliverWhatsappApiDto {
  @IsString()
  @MinLength(1)
  orderItemId!: string;
}
