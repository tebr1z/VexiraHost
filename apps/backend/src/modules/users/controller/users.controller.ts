import { Body, Controller, Get, Patch } from "@nestjs/common";

import { User } from "@/decorators/user.decorator";
import type { AuthUser } from "@vexira/types";

import { UpdateBillingAddressDto, UpdateUserPreferencesDto } from "../dto";
import { UsersService } from "../service/users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getProfile(@User() user: AuthUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch("me/preferences")
  updatePreferences(@User() user: AuthUser, @Body() dto: UpdateUserPreferencesDto) {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @Patch("me/billing-address")
  updateBillingAddress(@User() user: AuthUser, @Body() dto: UpdateBillingAddressDto) {
    return this.usersService.updateBillingAddress(user.id, dto);
  }
}
