import { Body, Controller, Get, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthUser } from "@vexira/types";
import type { Request, Response } from "express";

import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResendLoginOtpDto,
  ResetPasswordDto,
  UpdateLocaleDto,
  VerifyEmailDto,
  VerifyLoginOtpDto,
} from "../dto";
import { GitHubAuthGuard, GoogleAuthGuard } from "../guards/oauth.guards";
import type { OAuthProfile } from "../interfaces";
import { AuthService } from "../service/auth.service";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import { getClientIp } from "@/utils/client-ip.util";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, {
      userAgent: req.headers["user-agent"],
      ip: getClientIp(req),
    });
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      userAgent: req.headers["user-agent"],
      ip: getClientIp(req),
    });
  }

  @Public()
  @Post("login/verify-otp")
  verifyLoginOtp(@Body() dto: VerifyLoginOtpDto, @Req() req: Request) {
    return this.authService.verifyLoginOtp(dto, {
      userAgent: req.headers["user-agent"],
      ip: getClientIp(req),
    });
  }

  @Public()
  @Post("login/resend-otp")
  resendLoginOtp(@Body() dto: ResendLoginOtpDto) {
    return this.authService.resendLoginOtp(dto);
  }

  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, {
      userAgent: req.headers["user-agent"],
      ip: getClientIp(req),
    });
  }

  @Public()
  @Post("logout")
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Post("verify-email")
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Get("verify-email")
  verifyEmailRedirect(@Query("token") token: string | undefined, @Res() res: Response) {
    const appUrl = this.configService
      .get<string>("APP_URL", "http://localhost:3000")
      .replace(/\/$/, "");
    if (!token) {
      res.redirect(`${appUrl}/verify-email`);
      return;
    }
    res.redirect(`${appUrl}/verify-email?token=${encodeURIComponent(token)}`);
  }

  @Post("resend-verification")
  resendVerification(@User() user: AuthUser) {
    return this.authService.resendVerificationEmail(user.id);
  }

  @Public()
  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get("linked-providers")
  linkedProviders(@User() user: AuthUser) {
    return this.authService.getLinkedProviders(user.id);
  }

  @Patch("locale")
  updateLocale(@User() user: AuthUser, @Body() dto: UpdateLocaleDto) {
    return this.authService.recordPreferredLocale(user.id, dto.locale);
  }

  @Public()
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Passport redirects to Google
  }

  @Public()
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request & { user: OAuthProfile; query?: { state?: string; error?: string } },
    @Res() res: Response,
  ) {
    const appUrl = this.configService
      .get<string>("APP_URL", "http://localhost:3000")
      .replace(/\/$/, "");
    if (req.query?.error) {
      res.redirect(`${appUrl}/login?oauthError=${encodeURIComponent(String(req.query.error))}`);
      return;
    }
    try {
      const result = await this.authService.loginWithOAuth(req.user, {
        userAgent: req.headers["user-agent"],
        ip: getClientIp(req),
        locale: typeof req.query?.state === "string" ? req.query.state : undefined,
      });
      res.redirect(this.authService.buildOAuthRedirectUrl(result, "google"));
    } catch {
      res.redirect(`${appUrl}/login?oauthError=google_failed`);
    }
  }

  @Public()
  @Get("github")
  @UseGuards(GitHubAuthGuard)
  githubAuth() {
    // Passport redirects to GitHub
  }

  @Public()
  @Get("github/callback")
  @UseGuards(GitHubAuthGuard)
  async githubCallback(@Req() req: Request & { user: OAuthProfile }, @Res() res: Response) {
    const result = await this.authService.loginWithOAuth(req.user, {
      userAgent: req.headers["user-agent"],
      ip: getClientIp(req),
    });
    res.redirect(this.authService.buildOAuthRedirectUrl(result));
  }
}
