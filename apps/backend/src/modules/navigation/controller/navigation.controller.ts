import { Controller, Get, Query } from "@nestjs/common";

import { Public } from "@/decorators/auth.decorators";

import { NavigationService } from "../service/navigation.service";

@Controller("navigation")
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Public()
  @Get()
  list(@Query("locale") locale?: string) {
    return this.navigationService.listPublic(locale ?? "tr");
  }
}
