import { Module } from "@nestjs/common";

import { ServersController } from "./controller/servers.controller";
import { MockProxmoxProvider } from "./providers/mock-proxmox.provider";
import { ServersRepository } from "./repository/servers.repository";
import { ServersService } from "./service/servers.service";

@Module({
  controllers: [ServersController],
  providers: [ServersService, ServersRepository, MockProxmoxProvider],
  exports: [ServersService],
})
export class ServersModule {}
