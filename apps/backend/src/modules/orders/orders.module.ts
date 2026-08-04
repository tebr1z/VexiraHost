import { Module } from "@nestjs/common";

import { OrdersController } from "./controller/orders.controller";
import { OrdersRepository } from "./repository/orders.repository";
import { OrderEmailService } from "./service/order-email.service";
import { OrdersService } from "./service/orders.service";

import { AuthModule } from "@/modules/auth/auth.module";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, OrderEmailService, SmtpMailService],
  exports: [OrdersService],
})
export class OrdersModule {}
