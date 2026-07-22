import { Module } from "@nestjs/common";

import { AdminNavigationController } from "./controller/admin-navigation.controller";
import { NavigationController } from "./controller/navigation.controller";
import { NavigationRepository } from "./repository/navigation.repository";
import { AdminNavigationService } from "./service/admin-navigation.service";
import { NavigationService } from "./service/navigation.service";

@Module({
  controllers: [NavigationController, AdminNavigationController],
  providers: [NavigationService, AdminNavigationService, NavigationRepository],
  exports: [NavigationService, AdminNavigationService],
})
export class NavigationModule {}
