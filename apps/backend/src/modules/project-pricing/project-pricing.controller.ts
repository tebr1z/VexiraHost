import { Body, Controller, Get, Header, Put, UseGuards } from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { SaveProjectPricingDto } from "./project-pricing.dto";
import { ProjectPricingService } from "./project-pricing.service";

import { Public, Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

@Controller("project-pricing")
export class PublicProjectPricingController {
  constructor(private readonly pricing: ProjectPricingService) {}
  @Public() @Get() @Header("Cache-Control", "no-store") get() {
    return this.pricing.get();
  }
}
@Controller("admin/project-pricing")
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProjectPricingController {
  constructor(private readonly pricing: ProjectPricingService) {}
  @Get() @Header("Cache-Control", "no-store") get() {
    return this.pricing.get();
  }
  @Put() save(@Body() input: SaveProjectPricingDto) {
    return this.pricing.save(input);
  }
}
