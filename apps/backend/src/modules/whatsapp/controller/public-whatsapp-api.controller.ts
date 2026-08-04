import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";

import { SendWhatsappApiMessageDto } from "../dto/whatsapp.dto";
import { WhatsappApiKeyGuard, type WhatsappApiRequest } from "../guards/whatsapp-api-key.guard";
import { WhatsappApiService } from "../service/whatsapp-api.service";

import { Public } from "@/decorators/auth.decorators";

@Controller("whatsapp/messages")
@Public()
@UseGuards(WhatsappApiKeyGuard)
export class PublicWhatsappApiController {
  constructor(private readonly service: WhatsappApiService) {}

  @Post()
  send(@Req() request: WhatsappApiRequest, @Body() dto: SendWhatsappApiMessageDto) {
    return this.service.sendMessage(request.whatsappApi!, dto);
  }
}
