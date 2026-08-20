import { Module } from "@nestjs/common";

import { ContactController } from "./controller/contact.controller";
import { ContactService } from "./service/contact.service";

import { AuthModule } from "@/modules/auth/auth.module";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  imports: [AuthModule],
  controllers: [ContactController],
  providers: [ContactService, SmtpMailService],
})
export class ContactModule {}
