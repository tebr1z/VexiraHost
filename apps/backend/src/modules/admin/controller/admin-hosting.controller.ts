import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";
import { ServerSetupService } from "@/modules/deploy/service/server-setup.service";
import {
  MigrateHostingAccountsDto,
  UpdateHostingAccountStatusDto,
} from "@/modules/hosting/dto/hosting-account-admin.dto";
import {
  CreateHostingServerDto,
  UpdateHostingServerDto,
} from "@/modules/hosting/dto/hosting-server.dto";
import { HostingServersService } from "@/modules/hosting/service/hosting-servers.service";

@Controller("admin/hosting")
@UseGuards(RolesGuard)
export class AdminHostingController {
  constructor(
    private readonly hostingServersService: HostingServersService,
    private readonly serverSetupService: ServerSetupService,
  ) {}

  @Get("servers")
  @Roles(UserRole.ADMIN)
  listServers() {
    return this.hostingServersService.listServers();
  }

  @Post("servers")
  @Roles(UserRole.ADMIN)
  createServer(@Body() dto: CreateHostingServerDto) {
    return this.hostingServersService.createServer(dto);
  }

  @Get("servers/:id")
  @Roles(UserRole.ADMIN)
  getServer(@Param("id") id: string) {
    return this.hostingServersService.getServer(id);
  }

  @Patch("servers/:id")
  @Roles(UserRole.ADMIN)
  updateServer(@Param("id") id: string, @Body() dto: UpdateHostingServerDto) {
    return this.hostingServersService.updateServer(id, dto);
  }

  @Delete("servers/:id")
  @Roles(UserRole.ADMIN)
  deleteServer(@Param("id") id: string) {
    return this.hostingServersService.deleteServer(id);
  }

  @Post("servers/:id/test")
  @Roles(UserRole.ADMIN)
  testServer(@Param("id") id: string) {
    return this.hostingServersService.testServer(id);
  }

  @Get("servers/:id/setup")
  @Roles(UserRole.ADMIN)
  getServerSetup(@Param("id") id: string) {
    return this.serverSetupService.getStatus(id);
  }

  @Post("servers/:id/setup/probe")
  @Roles(UserRole.ADMIN)
  probeServerSetup(@Param("id") id: string) {
    return this.serverSetupService.probeTools(id);
  }

  @Post("servers/:id/setup/test-ssh")
  @Roles(UserRole.ADMIN)
  testServerSsh(@Param("id") id: string) {
    return this.serverSetupService.testSsh(id);
  }

  @Post("servers/:id/setup/bootstrap")
  @Roles(UserRole.ADMIN)
  bootstrapServer(@Param("id") id: string) {
    return this.serverSetupService.startBootstrap(id);
  }

  @Get("servers/:id/setup/bootstrap/:jobId")
  @Roles(UserRole.ADMIN)
  getBootstrapJob(@Param("id") id: string, @Param("jobId") jobId: string) {
    return this.serverSetupService.getBootstrapJob(id, jobId);
  }

  @Get("servers/:id/plesk-plans")
  @Roles(UserRole.ADMIN)
  listRemotePleskPlans(@Param("id") id: string) {
    return this.hostingServersService.getRemotePleskPlans(id);
  }

  @Post("servers/:id/sync-plans")
  @Roles(UserRole.ADMIN)
  syncPleskPlans(@Param("id") id: string) {
    return this.hostingServersService.syncPleskPlans(id);
  }

  @Get("servers/:id/accounts")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  listServerAccounts(@Param("id") id: string, @Query("activeOnly") activeOnly?: string) {
    return this.hostingServersService.listServerAccounts(id, activeOnly !== "false");
  }

  @Get("accounts")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  listAccounts() {
    return this.hostingServersService.listAccounts();
  }

  @Patch("accounts/:id/status")
  @Roles(UserRole.ADMIN)
  updateAccountStatus(@Param("id") id: string, @Body() dto: UpdateHostingAccountStatusDto) {
    return this.hostingServersService.updateAccountStatus(id, dto);
  }

  @Delete("accounts/:id")
  @Roles(UserRole.ADMIN)
  deleteAccount(@Param("id") id: string) {
    return this.hostingServersService.deleteAccount(id);
  }

  @Post("accounts/migrate")
  @Roles(UserRole.ADMIN)
  migrateAccounts(@Body() dto: MigrateHostingAccountsDto) {
    return this.hostingServersService.migrateAccounts(dto);
  }

  @Post("accounts/:id/retry-provision")
  @Roles(UserRole.ADMIN)
  retryAccountProvision(@Param("id") id: string) {
    return this.hostingServersService.adminRetryProvision(id);
  }

  @Post("accounts/:id/reassign-provision")
  @Roles(UserRole.ADMIN)
  reassignAccountProvision(@Param("id") id: string, @Body() body: { targetServerId: string }) {
    if (!body.targetServerId?.trim()) {
      throw new BadRequestException("targetServerId is required");
    }
    return this.hostingServersService.adminReassignAndRetryProvision(
      id,
      body.targetServerId.trim(),
    );
  }
}
