import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { JwtAuthGuard } from "@/guards/jwt-auth.guard";

import { AuthController } from "./controller/auth.controller";
import { AuthRepository } from "./repository/auth.repository";
import { AuthEmailService } from "./service/auth-email.service";
import { AuthService } from "./service/auth.service";
import { LoginAttemptService } from "./service/login-attempt.service";
import { GitHubStrategy } from "./strategies/github.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.accessSecret"),
        signOptions: {
          expiresIn: configService.get<string>("jwt.accessExpiresIn"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthEmailService,
    LoginAttemptService,
    AuthRepository,
    JwtStrategy,
    GoogleStrategy,
    GitHubStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, AuthRepository, JwtModule],
})
export class AuthModule {}
