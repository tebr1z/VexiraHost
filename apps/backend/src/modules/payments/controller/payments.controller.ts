import {
  Body,
  Controller,
  Header,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { AuthUser } from "@vexira/types";
import type { Request, Response } from "express";

import { ChargePaymentDto, EpointCallbackDto } from "../dto";
import { PaymentsService } from "../service/payments.service";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("methods")
  listMethods(@User() user: AuthUser) {
    return this.paymentsService.listMethods(user.id);
  }

  @Get("balance")
  getBalance(@User() user: AuthUser) {
    return this.paymentsService.getBalance(user.id);
  }

  @Get("kapital/:id/status")
  @Header("Cache-Control", "no-store")
  kapitalStatus(@Param("id") id: string, @User() user: AuthUser) {
    return this.paymentsService.getKapitalPaymentStatus(user.id, id);
  }

  @Post("charge")
  charge(@Body() dto: ChargePaymentDto, @User() user: AuthUser) {
    return this.paymentsService.charge(user.id, dto);
  }

  @Post("epoint/cards/register")
  registerEpointCard(@User() user: AuthUser, @Req() req: Request) {
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(",")[0]?.trim() || req.ip;
    return this.paymentsService.registerEpointCard(user.id, clientIp);
  }

  @Post("methods/:id/default")
  setDefaultMethod(@Param("id") id: string, @User() user: AuthUser) {
    return this.paymentsService.setDefaultMethod(user.id, id);
  }

  @Delete("methods/:id")
  disableMethod(@Param("id") id: string, @User() user: AuthUser) {
    return this.paymentsService.disableMethod(user.id, id);
  }

  @Public()
  @Post("epoint/callback")
  epointCallback(@Body() dto: EpointCallbackDto) {
    return this.paymentsService.handleEpointCallback(dto.data, dto.signature);
  }

  /** Kapital Bank HPP redirect target. */
  @Public()
  @Get("kapital/callback")
  async kapitalCallback(
    @Query("ID") id: string,
    @Query("STATUS") status: string | undefined,
    @Res() res: Response,
  ) {
    const returnBase = await this.paymentsService.getKapitalReturnUrl();
    const url = new URL(returnBase);

    if (!id) {
      url.searchParams.set("ok", "0");
      url.searchParams.set("reason", "missing_id");
      return res.redirect(302, url.toString());
    }

    const result = await this.paymentsService.handleKapitalCallback(id, status);
    url.searchParams.set("ok", result.ok ? "1" : "0");
    if (result.reason) url.searchParams.set("reason", result.reason);
    if (result.orderId) url.searchParams.set("orderId", result.orderId);
    if (result.invoiceId) url.searchParams.set("invoiceId", result.invoiceId);
    if ("bankStatus" in result && result.bankStatus) {
      url.searchParams.set("bankStatus", String(result.bankStatus));
    }

    return res.redirect(302, url.toString());
  }
}
