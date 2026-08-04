import { Module } from "@nestjs/common";

import { ServersController } from "./controller/servers.controller";
import { MockProxmoxProvider } from "./providers/mock-proxmox.provider";
import { ServersRepository } from "./repository/servers.repository";
import { ServerExpiryJobService } from "./service/server-expiry-job.service";
import { ServersService } from "./service/servers.service";

@Module({
  controllers: [ServersController],
  providers: [ServersService, ServerExpiryJobService, ServersRepository, MockProxmoxProvider],
  exports: [ServersService, ServerExpiryJobService],
})
export class ServersModule {}
