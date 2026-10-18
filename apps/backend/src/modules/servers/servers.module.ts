import { Module } from "@nestjs/common";

import { ServersController } from "./controller/servers.controller";
import { MockProxmoxProvider } from "./providers/mock-proxmox.provider";
import { RealProxmoxProvider } from "./providers/proxmox.provider";
import { ServersRepository } from "./repository/servers.repository";
import { ProxmoxGatewayService } from "./service/proxmox-gateway.service";
import { ServerExpiryJobService } from "./service/server-expiry-job.service";
import { ServersService } from "./service/servers.service";

@Module({
  controllers: [ServersController],
  providers: [
    ServersService,
    ServerExpiryJobService,
    ServersRepository,
    MockProxmoxProvider,
    RealProxmoxProvider,
    ProxmoxGatewayService,
  ],
  exports: [ServersService, ServerExpiryJobService],
})
export class ServersModule {}
