import { Module } from "@nestjs/common";

import { AuditController } from "./controller/audit.controller";
import { AuditRepository } from "./repository/audit.repository";
import { AuditService } from "./service/audit.service";

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
