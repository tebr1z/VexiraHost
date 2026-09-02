import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { DeployController } from "./controller/deploy.controller";
import { GitHubDeployController } from "./controller/github-deploy.controller";
import { GitHubDeployAuthGuard } from "./guards/github-deploy.guard";
import { DeployRepository } from "./repository/deploy.repository";
import { DeployHealthService } from "./service/deploy-health.service";
import { DeployRunner } from "./service/deploy.runner";
import { DeployService } from "./service/deploy.service";
import { GitHubDeployService } from "./service/github-deploy.service";
import { PleskSiteService } from "./service/plesk-site.service";
import { PortAllocationService } from "./service/port-allocation.service";
import { ApacheProxyService, RemoteDeployService } from "./service/remote-deploy.service";
import { ServerBootstrapService } from "./service/server-bootstrap.service";
import { ServerSetupService } from "./service/server-setup.service";
import { SshService } from "./service/ssh.service";
import { GitHubDeployStrategy } from "./strategies/github-deploy.strategy";

import { AuthModule } from "@/modules/auth/auth.module";
import { HostingModule } from "@/modules/hosting/hosting.module";

@Module({
  imports: [HostingModule, AuthModule, PassportModule.register({ session: false })],
  controllers: [DeployController, GitHubDeployController],
  providers: [
    DeployRepository,
    DeployService,
    DeployHealthService,
    DeployRunner,
    PleskSiteService,
    PortAllocationService,
    ServerBootstrapService,
    ServerSetupService,
    GitHubDeployService,
    GitHubDeployStrategy,
    GitHubDeployAuthGuard,
    SshService,
    ApacheProxyService,
    RemoteDeployService,
  ],
  exports: [DeployService, ServerSetupService, GitHubDeployService],
})
export class DeployModule {}
