import { Module } from "@nestjs/common";

import { AuthModule } from "@/modules/auth/auth.module";

import { OrdersController } from "./controller/orders.controller";
import { OrdersService } from "./service/orders.service";
import { OrdersRepository } from "./repository/orders.repository";

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService],
})
export class OrdersModule {}
