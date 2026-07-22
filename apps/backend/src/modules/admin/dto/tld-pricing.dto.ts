import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from "class-validator";

export class CreateTldPricingDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9-]+$/)
  tld!: string;

  @IsNumber()
  @Min(0)
  registerPrice!: number;

  @IsNumber()
  @Min(0)
  renewPrice!: number;

  @IsNumber()
  @Min(0)
  transferPrice!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateTldPricingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  registerPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  renewPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transferPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
