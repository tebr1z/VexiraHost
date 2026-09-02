import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import type { AuthUser } from "@vexira/types";

import {
  ConfirmTotpDto,
  DisableTotpDto,
  RequestPhoneVerificationDto,
  UpdateBillingAddressDto,
  UpdateEmailTwoFactorDto,
  UpdatePhoneDto,
  UpdateUserPreferencesDto,
  VerifyEmailTwoFactorDto,
  VerifyPhoneDto,
} from "../dto";
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

  @Post("me/phone/request-code")
  requestPhoneVerification(@User() user: AuthUser, @Body() dto: RequestPhoneVerificationDto) {
    return this.usersService.requestPhoneVerification(user.id, dto);
  }

  @Post("me/phone/verify")
  verifyPhone(@User() user: AuthUser, @Body() dto: VerifyPhoneDto) {
    return this.usersService.verifyPhone(user.id, dto);
  }

  @Patch("me/security/email-2fa")
  requestEmailTwoFactor(@User() user: AuthUser, @Body() dto: UpdateEmailTwoFactorDto) {
    return this.usersService.requestEmailTwoFactorChange(user.id, dto);
  }

  @Post("me/security/email-2fa/verify")
  verifyEmailTwoFactor(@User() user: AuthUser, @Body() dto: VerifyEmailTwoFactorDto) {
    return this.usersService.verifyEmailTwoFactorChange(user.id, dto);
  }

  @Post("me/security/totp/setup")
  setupTotp(@User() user: AuthUser) {
    return this.usersService.setupTotp(user.id);
  }

  @Post("me/security/totp/confirm")
  confirmTotp(@User() user: AuthUser, @Body() dto: ConfirmTotpDto) {
    return this.usersService.confirmTotp(user.id, dto);
  }

  @Post("me/security/totp/disable")
  disableTotp(@User() user: AuthUser, @Body() dto: DisableTotpDto) {
    return this.usersService.disableTotp(user.id, dto);
  }

  @Post("me/security/totp/cancel")
  cancelTotpSetup(@User() user: AuthUser) {
    return this.usersService.cancelTotpSetup(user.id);
  }
}
