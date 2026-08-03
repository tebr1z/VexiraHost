import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { Strategy, VerifyCallback } from "passport-google-oauth20";

import type { OAuthProfile } from "../interfaces";
import { OauthConfigService } from "../service/oauth-config.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    private readonly oauthConfigService: OauthConfigService,
    configService: ConfigService,
  ) {
    super({
      clientID: "not-configured",
      clientSecret: "not-configured",
      callbackURL:
        configService.get<string>("oauth.google.callbackUrl") ??
        "http://localhost:4000/api/v1/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  async authenticate(req: Request, options?: Record<string, unknown>): Promise<void> {
    try {
      const config = await this.oauthConfigService.resolveGoogle();
      if (!config.clientId || !config.clientSecret) {
        this.fail("Google OAuth is not configured", 401);
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
      name?: { givenName?: string; familyName?: string };
    },
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error("Google account has no email"), undefined);
      return;
    }

    done(null, {
      provider: "GOOGLE",
      providerId: profile.id,
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      emailVerified: profile.emails?.[0]?.verified ?? true,
    } satisfies OAuthProfile);
  }
}
