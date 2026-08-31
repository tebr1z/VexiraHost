import { Module } from "@nestjs/common";

import { DeployController } from "./controller/deploy.controller";
import { DeployRepository } from "./repository/deploy.repository";
import { DeployRunner } from "./service/deploy.runner";
import { DeployService } from "./service/deploy.service";
import { PleskSiteService } from "./service/plesk-site.service";
import { PortAllocationService } from "./service/port-allocation.service";
import { ApacheProxyService, RemoteDeployService } from "./service/remote-deploy.service";
import { ServerBootstrapService } from "./service/server-bootstrap.service";
import { SshService } from "./service/ssh.service";

import { HostingModule } from "@/modules/hosting/hosting.module";

@Module({
  imports: [HostingModule],
  controllers: [DeployController],
  providers: [
    DeployRepository,
    DeployService,
    DeployRunner,
    PleskSiteService,
    PortAllocationService,
    ServerBootstrapService,
    SshService,
    ApacheProxyService,
    RemoteDeployService,
  ],
  exports: [DeployService],
})
export class DeployModule {}
