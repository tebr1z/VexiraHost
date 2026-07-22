import { ExecutionContext, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";

import { resolveAuthEmailLocale } from "../email/auth-email.locale";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.configService.get<string>("oauth.google.clientId")) {
      throw new ServiceUnavailableException(
        "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env",
      );
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      query?: { login_hint?: string; locale?: string };
    }>();
    const options: { loginHint?: string; state?: string } = {};
    const loginHint = request.query?.login_hint;
    if (loginHint && typeof loginHint === "string") {
      options.loginHint = loginHint;
    }
    const locale = resolveAuthEmailLocale(request.query?.locale);
    options.state = locale;
    return options;
  }
}

@Injectable()
export class GitHubAuthGuard extends AuthGuard("github") {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.configService.get<string>("oauth.github.clientId")) {
      throw new ServiceUnavailableException(
        "GitHub OAuth is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env",
      );
    }
    return super.canActivate(context);
  }
}
