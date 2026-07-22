import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import type { AuthUser } from "@vexira/types";

import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "../dto";
import { GitHubAuthGuard, GoogleAuthGuard } from "../guards/oauth.guards";
import type { OAuthProfile } from "../interfaces";
import { AuthService } from "../service/auth.service";

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
      ip: req.ip,
    });
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
  }

  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
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
    const appUrl = this.configService.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
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
    @Req() req: Request & { user: OAuthProfile; query?: { state?: string } },
    @Res() res: Response,
  ) {
    const session = await this.authService.loginWithOAuth(req.user, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      locale: typeof req.query?.state === "string" ? req.query.state : undefined,
    });
    res.redirect(this.authService.buildOAuthRedirectUrl(session, "google"));
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
    const session = await this.authService.loginWithOAuth(req.user, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    res.redirect(this.authService.buildOAuthRedirectUrl(session));
  }
}
