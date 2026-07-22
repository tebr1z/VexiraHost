import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { User } from "@/decorators/user.decorator";
import type { AuthUser } from "@vexira/types";

import { CheckoutDto } from "../dto";
import { OrdersService } from "../service/orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("checkout")
  checkout(@Body() dto: CheckoutDto, @User() user: AuthUser) {
    return this.ordersService.checkout(user.id, dto);
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
