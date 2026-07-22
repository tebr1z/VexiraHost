import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

import {
  CreateNavGroupDto,
  CreateNavItemDto,
  UpdateNavGroupDto,
  UpdateNavItemDto,
} from "../dto/navigation.dto";
import { AdminNavigationService } from "../service/admin-navigation.service";

@Controller("admin/navigation")
@UseGuards(RolesGuard)
export class AdminNavigationController {
  constructor(private readonly adminNavigationService: AdminNavigationService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  listGroups() {
    return this.adminNavigationService.listGroups();
  }

  @Post("groups")
  @Roles(UserRole.ADMIN)
  createGroup(@Body() dto: CreateNavGroupDto) {
    return this.adminNavigationService.createGroup(dto);
  }

  @Patch("groups/:id")
  @Roles(UserRole.ADMIN)
  updateGroup(@Param("id") id: string, @Body() dto: UpdateNavGroupDto) {
    return this.adminNavigationService.updateGroup(id, dto);
  }

  @Delete("groups/:id")
  @Roles(UserRole.ADMIN)
  deleteGroup(@Param("id") id: string) {
    return this.adminNavigationService.deleteGroup(id);
  }

  @Post("groups/:groupId/items")
  @Roles(UserRole.ADMIN)
  createItem(@Param("groupId") groupId: string, @Body() dto: CreateNavItemDto) {
    return this.adminNavigationService.createItem(groupId, dto);
  }

  @Patch("items/:id")
  @Roles(UserRole.ADMIN)
  updateItem(@Param("id") id: string, @Body() dto: UpdateNavItemDto) {
    return this.adminNavigationService.updateItem(id, dto);
  }

  @Delete("items/:id")
  @Roles(UserRole.ADMIN)
  deleteItem(@Param("id") id: string) {
    return this.adminNavigationService.deleteItem(id);
  }
}
