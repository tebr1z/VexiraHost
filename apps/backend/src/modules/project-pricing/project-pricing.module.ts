import { Module } from "@nestjs/common";

import {
  AdminProjectPricingController,
  PublicProjectPricingController,
} from "./project-pricing.controller";
import { ProjectPricingService } from "./project-pricing.service";

import { RolesGuard } from "@/guards/roles.guard";

@Module({
  controllers: [AdminProjectPricingController, PublicProjectPricingController],
  providers: [ProjectPricingService, RolesGuard],
  exports: [ProjectPricingService],
})
export class ProjectPricingModule {}
