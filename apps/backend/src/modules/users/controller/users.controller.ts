import { Body, Controller, Get, Patch } from "@nestjs/common";
import type { AuthUser } from "@vexira/types";

import { UpdateBillingAddressDto, UpdatePhoneDto, UpdateUserPreferencesDto } from "../dto";
import { UsersService } from "../service/users.service";

import { User } from "@/decorators/user.decorator";

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

  @Patch("me/phone")
  updatePhone(@User() user: AuthUser, @Body() dto: UpdatePhoneDto) {
    return this.usersService.updatePhone(user.id, dto);
  }
}
