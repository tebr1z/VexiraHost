import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";

import { User } from "@/decorators/user.decorator";
import type { AuthUser } from "@vexira/types";

import { BillingService } from "../service/billing.service";

@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("invoices")
  listInvoices(@User() user: AuthUser) {
    return this.billingService.listInvoices(user.id);
  }

  @Get("invoices/:id")
  getInvoice(@Param("id") id: string, @User() user: AuthUser) {
    return this.billingService.getInvoice(id, user.id);
  }

  @Get("invoices/:id/pdf")
  async downloadInvoicePdf(
    @Param("id") id: string,
    @User() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = await this.billingService.getInvoicePdf(id, user.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  }
}
