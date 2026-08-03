import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  subject!: string;

  @IsOptional()
  @IsString()
  previewText?: string;

  @IsString()
  @MinLength(1)
  bodyHtml!: string;

  @IsOptional()
  @IsString()
  bodyText?: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  subject?: string;

  @IsOptional()
  @IsString()
  previewText?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  bodyHtml?: string;

  @IsOptional()
  @IsString()
  bodyText?: string | null;
}

export class UnsubscribeDto {
  @IsString()
  @MinLength(8)
  token!: string;
}

export class SetMarketingOptInDto {
  @IsBoolean()
  marketingOptIn!: boolean;
}
