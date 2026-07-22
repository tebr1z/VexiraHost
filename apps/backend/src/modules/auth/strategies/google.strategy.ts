import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";

import type { OAuthProfile } from "../interfaces";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>("oauth.google.clientId") || "not-configured",
      clientSecret: configService.get<string>("oauth.google.clientSecret") || "not-configured",
      callbackURL:
        configService.get<string>("oauth.google.callbackUrl") ??
        "http://localhost:4000/api/v1/auth/google/callback",
      scope: ["email", "profile"],
    });
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
