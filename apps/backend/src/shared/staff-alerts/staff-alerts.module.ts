import { Global, Module } from "@nestjs/common";

import { StaffAlertService } from "./staff-alert.service";

import { WhatsappModule } from "@/modules/whatsapp/whatsapp.module";

@Global()
@Module({
  imports: [WhatsappModule],
  providers: [StaffAlertService],
  exports: [StaffAlertService],
})
export class StaffAlertsModule {}
