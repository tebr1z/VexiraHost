import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class SendWhatsappMessageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  userId?: string;

  @ValidateIf((o: SendWhatsappMessageDto) => !o.userId)
  @IsString()
  @MinLength(6)
  phone?: string;

  @IsString()
  @MinLength(1)
  message!: string;
}

export class CreateWhatsappGatewayAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label!: string;
}

export class UpdateWhatsappGatewayAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class CreateWhatsappApiKeyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class UpdateWhatsappApiKeyStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class UpdateWhatsappApiAccessDto {
  @IsBoolean()
  isEnabled!: boolean;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  monthlyLimit!: number;
}

export class SendWhatsappApiMessageDto {
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  message!: string;
}
