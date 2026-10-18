import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { UpdateSystemSettingsDto } from "../dto/system-settings.dto";
import { AdminSystemService } from "../service/admin-system.service";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

@Controller("admin/system")
@UseGuards(RolesGuard)
export class AdminSystemController {
  constructor(private readonly systemService: AdminSystemService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  getSystemStatus() {
    return this.systemService.getSystemStatus();
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  updateSettings(@Body() dto: UpdateSystemSettingsDto) {
    return this.systemService.updateSettings(dto);
  }
}
