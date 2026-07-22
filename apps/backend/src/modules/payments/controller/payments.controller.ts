import { Body, Controller, Get, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import type { AuthUser } from "@vexira/types";

import { ChargePaymentDto, CreatePaymentMethodDto } from "../dto";
import { PaymentsService } from "../service/payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("methods")
  listMethods(@User() user: AuthUser) {
    return this.paymentsService.listMethods(user.id);
  }

  @Post("methods")
  createMethod(@Body() dto: CreatePaymentMethodDto, @User() user: AuthUser) {
    return this.paymentsService.createMethod(user.id, dto);
  }

  @Post("charge")
  charge(@Body() dto: ChargePaymentDto, @User() user: AuthUser) {
    return this.paymentsService.charge(user.id, dto);
  }

  /**
   * Kapital Bank HPP redirect target.
   * Sample: /payments/kapital/callback?ID=1234&STATUS=FullyPaid
   */
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
