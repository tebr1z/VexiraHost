import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-github2";

import type { GitHubDeployProfile } from "../service/github-deploy.service";

@Injectable()
export class GitHubDeployStrategy extends PassportStrategy(Strategy, "github-deploy") {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>("oauth.github.clientId") || "not-configured",
      clientSecret: configService.get<string>("oauth.github.clientSecret") || "not-configured",
      callbackURL:
        configService.get<string>("oauth.github.deployCallbackUrl") ??
        "http://localhost:4000/api/v1/deploy/github/oauth/callback",
      scope: ["read:user", "repo"],
    });
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
