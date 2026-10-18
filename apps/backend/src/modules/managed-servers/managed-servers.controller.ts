import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "@vexira/types";
import { UserRole } from "@vexira/types";

import {
  CreateManagedServerDto,
  FixManagedServerFindingDto,
  InstallManagedServerDto,
  UpdateManagedServerDto,
} from "./dto/managed-server.dto";
import { ManagedServersService } from "./managed-servers.service";

import { Roles } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import { RolesGuard } from "@/guards/roles.guard";

@Controller("managed-servers")
export class ManagedServersController {
  constructor(private readonly service: ManagedServersService) {}

  @Get("catalog")
  catalog() {
    return this.service.getCatalog();
  }

  @Get()
  list(@User() user: AuthUser) {
    return this.service.listForUser(user.id);
  }

  @Post()
  create(@User() user: AuthUser, @Body() dto: CreateManagedServerDto) {
    return this.service.create(user.id, dto);
  }

  @Get(":id")
  get(@User() user: AuthUser, @Param("id") id: string) {
    return this.service.getForUser(id, user.id);
  }

  @Patch(":id")
  update(@User() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateManagedServerDto) {
    return this.service.update(id, user.id, dto);
  }

  @Delete(":id")
  remove(@User() user: AuthUser, @Param("id") id: string) {
    return this.service.remove(id, user.id);
  }

  @Post(":id/check")
  check(@User() user: AuthUser, @Param("id") id: string) {
    return this.service.requestConnectionCheck(id, user.id);
  }

  @Post(":id/install")
  install(@User() user: AuthUser, @Param("id") id: string, @Body() dto: InstallManagedServerDto) {
    return this.service.requestInstall(id, user.id, dto);
  }

  @Post(":id/security-scan")
  securityScan(@User() user: AuthUser, @Param("id") id: string) {
    return this.service.requestSecurityScan(id, user.id);
  }

  @Post(":id/optimization-scan")
  optimizationScan(@User() user: AuthUser, @Param("id") id: string) {
    return this.service.requestOptimizationScan(id, user.id);
  }

  @Post(":id/findings/:findingId/fix")
  fixFinding(
    @User() user: AuthUser,
    @Param("id") id: string,
    @Param("findingId") findingId: string,
    @Body() dto: FixManagedServerFindingDto,
  ) {
    return this.service.requestFindingFix(id, findingId, user.id, dto.confirmChanges);
  }
}

@Controller("admin/managed-servers")
@UseGuards(RolesGuard)
export class AdminManagedServersController {
  constructor(private readonly service: ManagedServersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  list() {
    return this.service.listAll();
  }

  @Post("tasks/:taskId/approve")
  @Roles(UserRole.ADMIN)
  approve(@User() user: AuthUser, @Param("taskId") taskId: string) {
    return this.service.approveTask(taskId, user.id);
  }
}
