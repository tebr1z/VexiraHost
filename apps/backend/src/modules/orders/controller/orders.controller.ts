import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { AuthUser } from "@vexira/types";

import { CheckoutDto, ValidatePromoDto } from "../dto";
import { OrdersService } from "../service/orders.service";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("checkout")
  checkout(@Body() dto: CheckoutDto, @User() user: AuthUser) {
    return this.ordersService.checkout(user.id, dto);
  }

  @Public()
  @Post("promo/validate")
  validatePromo(@Body() dto: ValidatePromoDto, @User() user?: AuthUser) {
    return this.ordersService.validatePromo(user?.id ?? null, dto);
  }

  @Get()
  list(@User() user: AuthUser) {
    return this.ordersService.listForUser(user.id);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @User() user: AuthUser) {
    return this.ordersService.getForUser(id, user.id);
  }
}
