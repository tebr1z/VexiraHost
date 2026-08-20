import { TicketPriority, TicketRelatedServiceType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketRelatedServiceType)
  relatedServiceType?: TicketRelatedServiceType;

  @IsOptional()
  @IsString()
  relatedServiceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}

export class ReplyTicketDto {
  @IsString()
  @MinLength(1)
  message!: string;
}

export { UpdateTicketStatusDto } from "./update-ticket-status.dto";
