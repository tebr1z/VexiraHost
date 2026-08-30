import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AuthUser } from "@vexira/types";
import { UserRole } from "@vexira/types";
import type { Request } from "express";

import {
  FulfillOrderDto,
  DeliverLicenseDto,
  DeliverWhatsappApiDto,
  UpdateAdminUserDto,
  UpdateAdminUserRoleDto,
  UpdateAdminUserStatusDto,
  AdminCreditBalanceDto,
  UpdateManualDomainDto,
} from "../dto";
import { AssignManualDomainDto } from "../dto/manual-domain.dto";
import {
  AssignManualHostingAccountDto,
  UpdateManualHostingAccountDto,
} from "../dto/manual-hosting.dto";
import { AdminCustomerDomainsService } from "../service/admin-customer-domains.service";
import { AdminCustomerHostingService } from "../service/admin-customer-hosting.service";
import { AdminService } from "../service/admin.service";

import { Roles } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import { RolesGuard } from "@/guards/roles.guard";
import { BalanceService } from "@/modules/payments/service/balance.service";
import { UpdateTicketStatusDto } from "@/modules/tickets/dto";
import { TicketsService } from "@/modules/tickets/service/tickets.service";

@Controller("admin")
@UseGuards(RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly ticketsService: TicketsService,
    private readonly customerDomainsService: AdminCustomerDomainsService,
    private readonly customerHostingService: AdminCustomerHostingService,
    private readonly balanceService: BalanceService,
  ) {}

  @Get("dashboard")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get("users")
  @Roles(UserRole.ADMIN)
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get("users/:id")
  @Roles(UserRole.ADMIN)
  getUser(@Param("id") id: string) {
    return this.adminService.getUser(id);
  }

  @Patch("users/:id")
  @Roles(UserRole.ADMIN)
  updateUser(@User() actor: AuthUser, @Param("id") id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminService.updateUser(actor, id, dto);
  }

  @Patch("users/:id/role")
  @Roles(UserRole.ADMIN)
  updateUserRole(
    @User() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateAdminUserRoleDto,
  ) {
    return this.adminService.updateUserRole(actor, id, dto);
  }

  @Patch("users/:id/status")
  @Roles(UserRole.ADMIN)
  updateUserStatus(
    @User() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateAdminUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(actor, id, dto);
  }

  @Delete("users/:id")
  @Roles(UserRole.ADMIN)
  deleteUser(@User() actor: AuthUser, @Param("id") id: string) {
    return this.adminService.deleteUser(actor, id);
  }

  @Post("users/:id/impersonate")
  @Roles(UserRole.ADMIN)
  impersonateUser(@User() actor: AuthUser, @Param("id") id: string, @Req() req: Request) {
    return this.adminService.impersonateUser(actor, id, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
  }

  @Get("users/:id/domains")
  @Roles(UserRole.ADMIN)
  listUserDomains(@Param("id") id: string) {
    return this.customerDomainsService.listUserManualDomains(id);
  }

  @Post("users/:id/domains")
  @Roles(UserRole.ADMIN)
  assignUserDomain(@Param("id") id: string, @Body() dto: AssignManualDomainDto) {
    return this.customerDomainsService.assignManualDomain(dto, id);
  }

  @Patch("users/:id/domains/:domainId")
  @Roles(UserRole.ADMIN)
  updateUserDomain(
    @Param("id") id: string,
    @Param("domainId") domainId: string,
    @Body() dto: UpdateManualDomainDto,
  ) {
    return this.customerDomainsService.updateManualDomain(id, domainId, dto);
  }

  @Delete("users/:id/domains/:domainId")
  @Roles(UserRole.ADMIN)
  deleteUserDomain(@Param("id") id: string, @Param("domainId") domainId: string) {
    return this.customerDomainsService.deleteManualDomain(id, domainId);
  }

  @Post("users/:id/balance")
  @Roles(UserRole.ADMIN)
  creditUserBalance(
    @User() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: AdminCreditBalanceDto,
  ) {
    return this.balanceService.adminCredit({
      userId: id,
      amount: dto.amount,
      currency: dto.currency,
      note: dto.note,
      adminId: actor.id,
    });
  }

  @Get("users/:id/hosting-accounts")
  @Roles(UserRole.ADMIN)
  listUserHostingAccounts(@Param("id") id: string) {
    return this.customerHostingService.listUserManualHostingAccounts(id);
  }

  @Post("users/:id/hosting-accounts")
  @Roles(UserRole.ADMIN)
  assignUserHostingAccount(@Param("id") id: string, @Body() dto: AssignManualHostingAccountDto) {
    return this.customerHostingService.assignManualHostingAccount(id, dto);
  }

  @Patch("users/:id/hosting-accounts/:accountId")
  @Roles(UserRole.ADMIN)
  updateUserHostingAccount(
    @Param("id") id: string,
    @Param("accountId") accountId: string,
    @Body() dto: UpdateManualHostingAccountDto,
  ) {
    return this.customerHostingService.updateManualHostingAccount(id, accountId, dto);
  }

  @Delete("users/:id/hosting-accounts/:accountId")
  @Roles(UserRole.ADMIN)
  deleteUserHostingAccount(@Param("id") id: string, @Param("accountId") accountId: string) {
    return this.customerHostingService.deleteManualHostingAccount(id, accountId);
  }

  @Get("orders")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  listOrders(@Query("status") status?: string, @Query("search") search?: string) {
    return this.adminService.listOrders({ status, search });
  }

  @Get("orders/:id")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  getOrder(@Param("id") id: string) {
    return this.adminService.getOrder(id);
  }

  @Post("orders/:id/fulfill")
  @Roles(UserRole.ADMIN)
  fulfillOrder(@Param("id") id: string, @Body() dto: FulfillOrderDto = {}) {
    return this.adminService.fulfillOrder(id, {
      alreadyDeployed: dto.alreadyDeployed === true,
    });
  }

  @Post("orders/:id/deliver-license")
  @Roles(UserRole.ADMIN)
  deliverLicense(@Param("id") id: string, @Body() dto: DeliverLicenseDto) {
    return this.adminService.deliverLicense(id, dto);
  }

  @Post("orders/:id/deliver-whatsapp-api")
  @Roles(UserRole.ADMIN)
  deliverWhatsappApi(@Param("id") id: string, @Body() dto: DeliverWhatsappApiDto) {
    return this.adminService.deliverWhatsappApi(id, dto);
  }

  @Get("invoices")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  listInvoices() {
    return this.adminService.listInvoices();
  }

  @Get("tickets")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  listTickets() {
    return this.adminService.listTickets();
  }

  @Patch("tickets/:id/status")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  updateTicketStatus(@Param("id") id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.ticketsService.updateStatus(id, dto.status);
  }

  @Get("payments")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  listPayments(@Query("status") status?: string, @Query("search") search?: string) {
    return this.adminService.listPayments({ status, search });
  }
}
