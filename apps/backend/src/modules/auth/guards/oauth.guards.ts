import type { ExecutionContext } from "@nestjs/common";
import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";

import { resolveAuthEmailLocale } from "../email/auth-email.locale";
import { OauthConfigService } from "../service/oauth-config.service";
import { TurnstileService } from "../service/turnstile.service";

import { getClientIp } from "@/utils/client-ip.util";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  constructor(
    private readonly oauthConfigService: OauthConfigService,
    private readonly turnstileService: TurnstileService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const config = await this.oauthConfigService.resolveGoogle();
    if (!config.clientId || !config.clientSecret) {
      throw new ServiceUnavailableException(
        "Google OAuth is not configured. Set Client ID and Client Secret in Admin → System.",
      );
    }

    const request = context.switchToHttp().getRequest<
      Request & {
        query?: {
          login_hint?: string;
          locale?: string;
          code?: string;
          turnstileToken?: string;
          intent?: string;
        };
      }
    >();

    // Initial /auth/google hop only — callback already has `code` from Google.
    if (!request.query?.code) {
      const intent = request.query?.intent === "signup" ? "signup" : "login";
      const token =
        typeof request.query?.turnstileToken === "string"
          ? request.query.turnstileToken
          : undefined;
      try {
        await this.turnstileService.assertValid(token, intent, getClientIp(request));
      } catch {
        const response = context.switchToHttp().getResponse<Response>();
        const appUrl = this.configService
          .get<string>("APP_URL", "http://localhost:3000")
          .replace(/\/$/, "");
        const path = intent === "signup" ? "register" : "login";
        response.redirect(`${appUrl}/${path}?oauthError=turnstile`);
        return false;
      }
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      query?: { login_hint?: string; locale?: string; code?: string };
    }>();
    const options: { session: false; loginHint?: string; state?: string } = {
      // No express-session in this API — required for OAuth callback
      session: false,
    };

    // Only set state on the initial /auth/google hop.
    // On callback Google already returns state — overwriting it breaks CSRF/state check.
    if (!request.query?.code) {
      const loginHint = request.query?.login_hint;
      if (loginHint && typeof loginHint === "string") {
        options.loginHint = loginHint;
      }
      options.state = resolveAuthEmailLocale(request.query?.locale);
    }

    return options;
  }

  handleRequest<TUser>(err: Error | null, user: TUser | false, info?: Error | string): TUser {
    if (err || !user) {
      const detail =
        (err && err.message) ||
        (typeof info === "string" ? info : info?.message) ||
        "Google authentication failed";
      throw new UnauthorizedException(detail);
    }
    return user;
  }
}

@Injectable()
export class GitHubAuthGuard extends AuthGuard("github") {
  constructor(private readonly oauthConfigService: OauthConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const config = await this.oauthConfigService.resolveGitHub();
    if (!config.clientId || !config.clientSecret) {
      throw new ServiceUnavailableException(
        "GitHub OAuth is not configured. Set Client ID and Client Secret in Admin → System.",
      );
    }
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  getAuthenticateOptions() {
    return { session: false as const };
  }

  handleRequest<TUser>(err: Error | null, user: TUser | false, info?: Error | string): TUser {
    if (err || !user) {
      const detail =
        (err && err.message) ||
        (typeof info === "string" ? info : info?.message) ||
        "GitHub authentication failed";
      throw new UnauthorizedException(detail);
    }
    return user;
  }
}
