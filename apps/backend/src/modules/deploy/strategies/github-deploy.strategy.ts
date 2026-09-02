import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { Strategy } from "passport-github2";

import type { GitHubDeployProfile } from "../service/github-deploy.service";

import { OauthConfigService } from "@/modules/auth/service/oauth-config.service";

@Injectable()
export class GitHubDeployStrategy extends PassportStrategy(Strategy, "github-deploy") {
  constructor(
    private readonly oauthConfigService: OauthConfigService,
    configService: ConfigService,
  ) {
    super({
      clientID: "not-configured",
      clientSecret: "not-configured",
      callbackURL:
        configService.get<string>("oauth.github.deployCallbackUrl") ??
        "http://localhost:4000/api/v1/deploy/github/oauth/callback",
      scope: ["read:user", "repo"],
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
      strategy._callbackURL = config.deployCallbackUrl;

      Strategy.prototype.authenticate.call(this, req, options);
    } catch (err) {
      this.error(err as Error);
    }
  }

  validate(
    accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      username?: string;
    },
    done: (error: Error | null, user?: GitHubDeployProfile) => void,
  ): void {
    done(null, {
      accessToken,
      githubUserId: profile.id,
      githubLogin: profile.username ?? profile.id,
      scope: "read:user repo",
    });
  }
}
