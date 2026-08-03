import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@vexira/types";
import type { AuthUser } from "@vexira/types";

import {
  AssignManualDomainDto,
  ListDomainChangesQueryDto,
  UpdateDomainChangeStatusDto,
} from "../dto/manual-domain.dto";
import { AdminCustomerDomainsService } from "../service/admin-customer-domains.service";

import { Roles } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import { RolesGuard } from "@/guards/roles.guard";

@Controller("admin/domains")
@UseGuards(RolesGuard)
export class AdminCustomerDomainsController {
  constructor(private readonly customerDomainsService: AdminCustomerDomainsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  listManualDomains() {
    return this.customerDomainsService.listManualDomains();
  }

  @Post("assign")
  @Roles(UserRole.ADMIN)
  assignManualDomain(@Body() dto: AssignManualDomainDto) {
    return this.customerDomainsService.assignManualDomain(dto);
  }

  @Get("changes")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  listChanges(@Query() query: ListDomainChangesQueryDto) {
    return this.customerDomainsService.listChangeRequests(query.status);
  }

  @Patch("changes/:id")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  updateChangeStatus(
    @Param("id") id: string,
    @User() admin: AuthUser,
    @Body() dto: UpdateDomainChangeStatusDto,
  ) {
    return this.customerDomainsService.updateChangeRequestStatus(id, admin.id, dto);
  }
}
