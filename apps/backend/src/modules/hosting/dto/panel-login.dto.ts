import { IsOptional, IsString } from "class-validator";

export class PanelLoginDto {
  @IsOptional()
  @IsString()
  clientIp?: string;
}
