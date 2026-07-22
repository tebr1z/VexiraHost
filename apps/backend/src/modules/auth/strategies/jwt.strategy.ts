import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { UserStatus } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AuthUser, JwtPayload } from "@vexira/types";

import { AuthRepository } from "../repository/auth.repository";
import { mapPrismaRoleToApp } from "@/utils/role.util";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("jwt.accessSecret"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.authRepository.findById(payload.sub);

    if (!user || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException("Invalid or inactive account");
    }

    return {
      id: user.id,
      email: user.email,
      role: mapPrismaRoleToApp(user.role),
      permissions: payload.permissions ?? [],
    };
  }
}
