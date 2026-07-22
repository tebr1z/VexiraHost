import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { TicketPriority, TicketRelatedServiceType } from "@prisma/client";
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
}

export class ReplyTicketDto {
  @IsString()
  @MinLength(1)
  message!: string;
}

export { UpdateTicketStatusDto } from "./update-ticket-status.dto";
