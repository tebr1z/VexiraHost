import { Module } from "@nestjs/common";

import {
  AdminManagedServersController,
  ManagedServersController,
} from "./managed-servers.controller";
import { ManagedServersRepository } from "./managed-servers.repository";
import { ManagedServersService } from "./managed-servers.service";

import { RolesGuard } from "@/guards/roles.guard";
import { DeployModule } from "@/modules/deploy/deploy.module";

@Module({
  imports: [DeployModule],
  controllers: [ManagedServersController, AdminManagedServersController],
  providers: [ManagedServersRepository, ManagedServersService, RolesGuard],
  exports: [ManagedServersService],
})
export class ManagedServersModule {}
