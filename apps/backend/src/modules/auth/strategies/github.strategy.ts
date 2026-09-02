import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { Strategy } from "passport-github2";

import type { OAuthProfile } from "../interfaces";
import { OauthConfigService } from "../service/oauth-config.service";

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, "github") {
  constructor(
    private readonly oauthConfigService: OauthConfigService,
    configService: ConfigService,
  ) {
    super({
      clientID: "not-configured",
      clientSecret: "not-configured",
      callbackURL:
        configService.get<string>("oauth.github.callbackUrl") ??
        "http://localhost:4000/api/v1/auth/github/callback",
      scope: ["user:email"],
    });
  }

  async authenticate(req: Request, options?: Record<string, unknown>): Promise<void> {
    try {
      const config = await this.oauthConfigService.resolveGitHub();
      if (!config.clientId || !config.clientSecret) {
        this.fail("GitHub OAuth is not configured", 401);
        return;
      }

      const strategy = this as unknown as {
        _oauth2: { _clientId: string; _clientSecret: string };
        _callbackURL: string;
      };
      strategy._oauth2._clientId = config.clientId;
      strategy._oauth2._clientSecret = config.clientSecret;
      strategy._callbackURL = config.callbackUrl;

      Strategy.prototype.authenticate.call(this, req, options);
    } catch (err) {
      this.error(err as Error);
    }
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string; verified?: boolean }[];
      displayName?: string;
      username?: string;
    },
    done: (error: Error | null, user?: OAuthProfile) => void,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error("GitHub account has no public email"));
      return;
    }

    done(null, {
      provider: "GITHUB",
      providerId: profile.id,
      email,
      firstName: profile.displayName ?? profile.username,
      emailVerified: profile.emails?.[0]?.verified ?? true,
    });
  }
}
