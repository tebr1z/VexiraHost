import { Type } from "class-transformer";
import {
  ValidateNested,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { ProjectQuoteRequestDto } from "@/modules/project-pricing/project-pricing.dto";

export class SubmitInquiryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectQuoteRequestDto)
  projectQuote?: ProjectQuoteRequestDto;

  @IsIn(["contact", "support"])
  kind!: "contact" | "support";

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subject?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}
