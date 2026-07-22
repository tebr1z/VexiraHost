import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

import { UpdateSystemSettingsDto } from "../dto/system-settings.dto";
import { AdminSystemService } from "../service/admin-system.service";

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
