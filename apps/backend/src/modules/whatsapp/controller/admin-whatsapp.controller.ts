import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@vexira/types";

import {
  CreateWhatsappGatewayAccountDto,
  SendWhatsappMessageDto,
  UpdateWhatsappApiAccessDto,
  UpdateWhatsappGatewayAccountDto,
} from "../dto/whatsapp.dto";
import { WhatsappApiService } from "../service/whatsapp-api.service";
import { WhatsappService } from "../service/whatsapp.service";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

@Controller("admin/whatsapp")
@UseGuards(RolesGuard)
export class AdminWhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly whatsappApiService: WhatsappApiService,
  ) {}

  @Get("status")
  @Roles(UserRole.ADMIN)
  status() {
    return this.whatsappService.getStatus();
  }

  @Get("qr")
  @Roles(UserRole.ADMIN)
  qr() {
    return this.whatsappService.getQr();
  }

  @Post("connect")
  @Roles(UserRole.ADMIN)
  connect() {
    return this.whatsappService.connect();
  }

  @Post("disconnect")
  @Roles(UserRole.ADMIN)
  disconnect() {
    return this.whatsappService.disconnect();
  }

  @Get("accounts")
  @Roles(UserRole.ADMIN)
  accounts() {
    return this.whatsappService.listGatewayAccounts();
  }

  @Post("accounts")
  @Roles(UserRole.ADMIN)
  createAccount(@Body() dto: CreateWhatsappGatewayAccountDto) {
    return this.whatsappService.createGatewayAccount(dto.label);
  }

  @Patch("accounts/:id")
  @Roles(UserRole.ADMIN)
  updateAccount(@Param("id") id: string, @Body() dto: UpdateWhatsappGatewayAccountDto) {
    return this.whatsappService.updateGatewayAccount(id, dto);
  }

  @Get("accounts/:id/qr")
  @Roles(UserRole.ADMIN)
  accountQr(@Param("id") id: string) {
    return this.whatsappService.getGatewayAccountQr(id);
  }

  @Post("accounts/:id/connect")
  @Roles(UserRole.ADMIN)
  connectAccount(@Param("id") id: string) {
    return this.whatsappService.connectGatewayAccount(id);
  }

  @Post("accounts/:id/disconnect")
  @Roles(UserRole.ADMIN)
  disconnectAccount(@Param("id") id: string) {
    return this.whatsappService.disconnectGatewayAccount(id);
  }

  @Get("users")
  @Roles(UserRole.ADMIN)
  users(@Query("q") q?: string) {
    return this.whatsappService.listUsers(q);
  }

  @Get("messages")
  @Roles(UserRole.ADMIN)
  messages() {
    return this.whatsappService.listMessages();
  }

  @Post("send")
  @Roles(UserRole.ADMIN)
  send(@Body() dto: SendWhatsappMessageDto) {
    return this.whatsappService.send(dto);
  }

  @Get("api/users/:userId")
  @Roles(UserRole.ADMIN)
  getApiAccess(@Param("userId") userId: string) {
    return this.whatsappApiService.getAdminAccess(userId);
  }

  @Patch("api/users/:userId")
  @Roles(UserRole.ADMIN)
  updateApiAccess(@Param("userId") userId: string, @Body() dto: UpdateWhatsappApiAccessDto) {
    return this.whatsappApiService.updateAdminAccess(userId, dto);
  }
}
