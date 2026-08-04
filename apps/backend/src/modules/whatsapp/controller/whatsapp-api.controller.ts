import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import type { AuthUser } from "@vexira/types";

import { CreateWhatsappApiKeyDto, UpdateWhatsappApiKeyStatusDto } from "../dto/whatsapp.dto";
import { WhatsappApiService } from "../service/whatsapp-api.service";

import { User } from "@/decorators/user.decorator";

@Controller("whatsapp-api")
export class WhatsappApiController {
  constructor(private readonly service: WhatsappApiService) {}

  @Get()
  dashboard(@User() user: AuthUser) {
    return this.service.getDashboard(user.id);
  }

  @Post("keys")
  createKey(@User() user: AuthUser, @Body() dto: CreateWhatsappApiKeyDto) {
    return this.service.createKey(user.id, dto);
  }

  @Delete("keys/:id")
  revokeKey(@User() user: AuthUser, @Param("id") id: string) {
    return this.service.revokeKey(user.id, id);
  }

  @Patch("keys/:id/status")
  updateKeyStatus(
    @User() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateWhatsappApiKeyStatusDto,
  ) {
    return this.service.updateKeyStatus(user.id, id, dto);
  }
}
