import { Controller, Get, Query } from "@nestjs/common";

import { NavigationService } from "../service/navigation.service";

import { Public } from "@/decorators/auth.decorators";

@Controller("navigation")
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Public()
  @Get()
  list(@Query("locale") locale?: string) {
    return this.navigationService.listPublic(locale ?? "tr");
  }
}
