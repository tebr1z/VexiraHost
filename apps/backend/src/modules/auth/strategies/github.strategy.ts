import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-github2";

import type { OAuthProfile } from "../interfaces";

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, "github") {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>("oauth.github.clientId") || "not-configured",
      clientSecret: configService.get<string>("oauth.github.clientSecret") || "not-configured",
      callbackURL:
        configService.get<string>("oauth.github.callbackUrl") ??
        "http://localhost:4000/api/v1/auth/github/callback",
      scope: ["user:email"],
    });
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
