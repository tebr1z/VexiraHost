import { Type } from "class-transformer";
import { IsString, MinLength, ValidateNested } from "class-validator";

export class BillingAddressDto {
  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsString()
  @MinLength(1)
  line1!: string;

  @IsString()
  @MinLength(1)
  city!: string;

  @IsString()
  @MinLength(1)
  region!: string;

  @IsString()
  @MinLength(1)
  postalCode!: string;

  @IsString()
  @MinLength(1)
  country!: string;
}

export class UpdateBillingAddressDto {
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress!: BillingAddressDto;
}
