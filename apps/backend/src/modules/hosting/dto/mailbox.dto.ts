import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class CreateMailboxDto {
  @IsString()
  @MinLength(1)
  @Matches(/^[a-z0-9][a-z0-9._-]{0,62}[a-z0-9]?$/i, {
    message: "Invalid mailbox name",
  })
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(102400)
  quotaMb?: number;
}

export class UpdateMailboxDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class WebmailLoginDto {
  @IsOptional()
  @IsString()
  clientIp?: string;

  /** Mailbox local part or full email — opens Roundcube with username prefilled. */
  @IsOptional()
  @IsString()
  mailbox?: string;
}
