import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type { AuthUser } from "@vexira/types";
import { UserRole } from "@vexira/types";

import { Roles } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import { RolesGuard } from "@/guards/roles.guard";
import { UpdateTicketStatusDto } from "@/modules/tickets/dto";
import { TicketsService } from "@/modules/tickets/service/tickets.service";

import {
  FulfillOrderDto,
  UpdateAdminUserDto,
  UpdateAdminUserRoleDto,
  UpdateAdminUserStatusDto,
} from "../dto";
import { AdminService } from "../service/admin.service";

@Controller("admin")
@UseGuards(RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly ticketsService: TicketsService,
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
  updateUser(
    @User() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
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

  @Post("users/:id/impersonate")
  @Roles(UserRole.ADMIN)
  impersonateUser(
    @User() actor: AuthUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.adminService.impersonateUser(actor, id, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
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
