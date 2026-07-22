import { Controller, Get } from "@nestjs/common";

import { Public } from "../../decorators/auth.decorators";
import { AdminSystemService } from "@/modules/admin/service/admin-system.service";

@Controller("health")
export class HealthController {
  constructor(private readonly adminSystemService: AdminSystemService) {}

  @Public()
  @Get()
  async check() {
    const system = await this.adminSystemService.getPublicSystemStatus();
    return { status: "ok", service: "vexira-host-api", ...system };
  }
}
