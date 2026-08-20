import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./controller/auth.controller";
import { GitHubAuthGuard, GoogleAuthGuard } from "./guards/oauth.guards";
import { AuthRepository } from "./repository/auth.repository";
import { AuthEmailService } from "./service/auth-email.service";
import { AuthService } from "./service/auth.service";
import { LoginAttemptService } from "./service/login-attempt.service";
import { OauthConfigService } from "./service/oauth-config.service";
import { SiteAccessService } from "./service/site-access.service";
import { TurnstileService } from "./service/turnstile.service";
import { GitHubStrategy } from "./strategies/github.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";

import { JwtAuthGuard } from "@/guards/jwt-auth.guard";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt", session: false }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("jwt.accessSecret"),
        signOptions: {
          expiresIn: configService.get<string>("jwt.accessExpiresIn"),
          algorithm: "HS256" as const,
        },
        verifyOptions: {
          algorithms: ["HS256" as const],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthEmailService,
    LoginAttemptService,
    OauthConfigService,
    TurnstileService,
    SiteAccessService,
    AuthRepository,
    JwtStrategy,
    GoogleStrategy,
    GitHubStrategy,
    GoogleAuthGuard,
    GitHubAuthGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [
    AuthService,
    AuthRepository,
    AuthEmailService,
    JwtModule,
    OauthConfigService,
    TurnstileService,
    SiteAccessService,
  ],
})
export class AuthModule {}
