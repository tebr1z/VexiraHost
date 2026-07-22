import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserStatus, type User } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import type { AuthUser } from "@vexira/types";
import { UserRole } from "@vexira/types";

import { generateSecureToken } from "@/utils/crypto.util";
import { mapPrismaRoleToApp } from "@/utils/role.util";

import type {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from "../dto";
import { AuthRepository } from "../repository/auth.repository";
import type { AuthResponse, AuthUserResponse } from "../types";
import { resolveAuthEmailLocale } from "../email/auth-email.locale";
import { AuthEmailService } from "./auth-email.service";
import { LoginAttemptService } from "./login-attempt.service";
import { resolveRegisterCurrency } from "@/shared/pricing/user-currency.util";
import {
  canChangeCurrency,
  nextCurrencyChangeAt,
} from "@/shared/pricing/user-currency.util";
import { normalizeBillingAddress } from "@/shared/billing/billing-address.util";

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_DAYS_REMEMBER = 7;
const REFRESH_TOKEN_HOURS_SESSION = 36;
const EMAIL_VERIFY_HOURS = 24;
const PASSWORD_RESET_HOURS = 1;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authEmailService: AuthEmailService,
    private readonly loginAttemptService: LoginAttemptService,
  ) {}

  async register(dto: RegisterDto, meta?: { userAgent?: string; ip?: string }): Promise<AuthResponse> {
    const existing = await this.authRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const currencyPrefs = resolveRegisterCurrency({
      preferredCurrency: dto.preferredCurrency,
      countryCode: dto.countryCode,
    });
    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      preferredCurrency: currencyPrefs.currency,
      currencyLocked: currencyPrefs.locked,
    });

    const verifyToken = generateSecureToken();
    await this.authRepository.createEmailVerificationToken(
      user.id,
      verifyToken,
      this.addHours(new Date(), EMAIL_VERIFY_HOURS),
    );

    this.logger.log(`Email verification token for ${user.email}: ${verifyToken}`);
    const locale = resolveAuthEmailLocale(dto.locale);
    try {
      await Promise.all([
        this.authEmailService.sendWelcomeEmail(user.email, locale, user.firstName, user.lastName),
        this.authEmailService.sendVerificationEmail(user.email, verifyToken, locale),
      ]);
    } catch (err) {
      this.logger.error(`Failed to send registration emails to ${user.email}: ${String(err)}`);
    }

    return this.buildAuthResponse(user, meta);
  }

  async login(dto: LoginDto, meta?: { userAgent?: string; ip?: string }): Promise<AuthResponse> {
    const locale = resolveAuthEmailLocale(dto.locale);
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException("Account is suspended");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const shouldAlert = this.loginAttemptService.recordFailure(user.email);
      if (shouldAlert) {
        try {
          await this.authEmailService.sendFailedPasswordAttemptsEmail(
            user.email,
            locale,
            user.firstName,
            user.lastName,
          );
        } catch (err) {
          this.logger.error(
            `Failed to send failed password alert to ${user.email}: ${String(err)}`,
          );
        }
      }
      throw new UnauthorizedException("Invalid email or password");
    }

    this.loginAttemptService.clear(user.email);
    return this.buildAuthResponse(user, meta, { rememberMe: dto.rememberMe ?? false });
  }

  async refresh(refreshToken: string, meta?: { userAgent?: string; ip?: string }): Promise<AuthResponse> {
    const record = await this.authRepository.findRefreshToken(refreshToken);
    if (!record) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const rememberMe = this.isRememberMeSession(record);
    await this.authRepository.revokeRefreshToken(refreshToken);
    return this.buildAuthResponse(record.user, meta, { rememberMe });
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.authRepository.revokeRefreshToken(refreshToken);
    return { message: "Logged out successfully" };
  }

  async verifyEmail(token: string): Promise<{ message: string } | AuthResponse> {
    const record = await this.authRepository.findEmailVerificationTokenAny(token);
    if (!record) {
      throw new BadRequestException("Invalid verification link");
    }

    if (record.user.emailVerifiedAt) {
      throw new BadRequestException("Email is already verified");
    }

    if (record.expiresAt <= new Date()) {
      throw new BadRequestException("Verification link has expired");
    }

    await this.authRepository.updateUserStatus(record.userId, UserStatus.ACTIVE, new Date());
    const refreshedUser = await this.authRepository.findById(record.userId);
    if (!refreshedUser) {
      throw new BadRequestException("User not found");
    }
    return this.buildAuthResponse(refreshedUser);
  }

  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (user.emailVerifiedAt) {
      return { message: "Email is already verified" };
    }

    const verifyToken = generateSecureToken();
    await this.authRepository.deleteEmailVerificationTokens(user.id);
    await this.authRepository.createEmailVerificationToken(
      user.id,
      verifyToken,
      this.addHours(new Date(), EMAIL_VERIFY_HOURS),
    );

    try {
      await this.authEmailService.sendVerificationEmail(user.email, verifyToken);
    } catch (err) {
      this.logger.error(`Failed to resend verification email to ${user.email}: ${String(err)}`);
    }

    return { message: "Verification email sent" };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      return { message: "If the email exists, a reset link has been sent" };
    }

    const resetToken = generateSecureToken();
    await this.authRepository.createPasswordResetToken(
      user.id,
      resetToken,
      this.addHours(new Date(), PASSWORD_RESET_HOURS),
    );

    this.logger.log(`Password reset token for ${user.email}: ${resetToken}`);
    try {
      await this.authEmailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${user.email}: ${String(err)}`);
    }

    return { message: "If the email exists, a reset link has been sent" };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const record = await this.authRepository.findPasswordResetToken(dto.token);
    if (!record) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.authRepository.updatePassword(record.userId, passwordHash);
    await this.authRepository.markPasswordResetTokenUsed(record.id);
    await this.authRepository.revokeAllUserRefreshTokens(record.userId);

    return { message: "Password reset successfully" };
  }

  async loginWithOAuth(
    profile: import("../interfaces").OAuthProfile,
    meta?: { userAgent?: string; ip?: string; locale?: string },
  ): Promise<AuthResponse> {
    const locale = resolveAuthEmailLocale(meta?.locale);
    const existingOAuth = await this.authRepository.findOAuthAccount(
      profile.provider,
      profile.providerId,
    );

    if (existingOAuth?.user) {
      if (existingOAuth.user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException("Account is suspended");
      }
      return this.buildAuthResponse(existingOAuth.user, meta);
    }

    const existingUser = await this.authRepository.findByEmail(profile.email);
    let user: User;
    let isNewGoogleAccount = false;
    let isGoogleAccountLinked = false;

    if (existingUser) {
      if (existingUser.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException("Account is suspended");
      }

      const existingProviderLink = await this.authRepository.findUserOAuthAccount(
        existingUser.id,
        profile.provider,
      );

      if (!existingProviderLink) {
        await this.authRepository.createOAuthAccount(
          existingUser.id,
          profile.provider,
          profile.providerId,
        );
        isGoogleAccountLinked = profile.provider === "GOOGLE";
      }

      if (profile.emailVerified && !existingUser.emailVerifiedAt) {
        user = await this.authRepository.updateUserStatus(
          existingUser.id,
          UserStatus.ACTIVE,
          new Date(),
        );
      } else {
        user = existingUser;
      }
    } else {
      user = await this.authRepository.createOAuthUser({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        emailVerified: profile.emailVerified,
      });
      await this.authRepository.createOAuthAccount(user.id, profile.provider, profile.providerId);
      isNewGoogleAccount = true;
    }

    if (profile.provider === "GOOGLE") {
      try {
        if (isNewGoogleAccount) {
          await this.authEmailService.sendGoogleWelcomeEmail(
            user.email,
            locale,
            user.firstName,
            user.lastName,
          );
        } else if (isGoogleAccountLinked) {
          await this.authEmailService.sendGoogleAccountLinkedEmail(
            user.email,
            locale,
            user.firstName,
            user.lastName,
          );
        }
      } catch (err) {
        this.logger.error(`Failed to send Google auth email to ${user.email}: ${String(err)}`);
      }
    }

    return this.buildAuthResponse(user, meta);
  }

  async getLinkedProviders(userId: string) {
    return this.authRepository.getLinkedOAuthProviders(userId);
  }

  async impersonateUser(
    actor: AuthUser,
    targetUserId: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthResponse> {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only administrators can impersonate users");
    }

    if (actor.id === targetUserId) {
      throw new ForbiddenException("You cannot impersonate yourself");
    }

    const target = await this.authRepository.findById(targetUserId);
    if (!target) {
      throw new NotFoundException("User not found");
    }

    if (mapPrismaRoleToApp(target.role) === UserRole.ADMIN) {
      throw new ForbiddenException("Cannot impersonate administrator accounts");
    }

    if (target.status === UserStatus.SUSPENDED) {
      throw new BadRequestException("Cannot impersonate suspended accounts");
    }

    this.logger.warn(
      `Admin ${actor.email} (${actor.id}) impersonating ${target.email} (${target.id})`,
    );

    return this.buildAuthResponse(target, meta);
  }

  buildOAuthRedirectUrl(session: AuthResponse, provider?: "google" | "github"): string {
    const base = this.configService.get<string>(
      "oauth.frontendCallbackUrl",
      "http://localhost:3000/auth/callback",
    );
    const url = new URL(base);
    url.searchParams.set("accessToken", session.tokens.accessToken);
    url.searchParams.set("refreshToken", session.tokens.refreshToken);
    if (provider) {
      url.searchParams.set("provider", provider);
    }
    return url.toString();
  }

  mapUser(user: User): AuthUserResponse {
    const nextChange = nextCurrencyChangeAt(user.currencyChangedAt);
    const allowed = canChangeCurrency({
      currencyLocked: user.currencyLocked,
      currencyChangedAt: user.currencyChangedAt,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: mapPrismaRoleToApp(user.role),
      emailVerified: Boolean(user.emailVerifiedAt),
      status: user.status,
      preferredCurrency: user.preferredCurrency,
      billingPeriod: user.billingPeriod,
      currencyLocked: user.currencyLocked,
      currencyChangedAt: user.currencyChangedAt?.toISOString() ?? null,
      canChangeCurrency: allowed,
      nextCurrencyChangeAt: allowed ? null : (nextChange?.toISOString() ?? null),
      billingAddress: normalizeBillingAddress(user.billingAddress),
    };
  }

  private async buildAuthResponse(
    user: User,
    meta?: { userAgent?: string; ip?: string },
    options?: { rememberMe?: boolean },
  ): Promise<AuthResponse> {
    const permissions: string[] = [];
    const accessExpiresIn = this.configService.get<string>("jwt.accessExpiresIn", "15m");
    const rememberMe = options?.rememberMe ?? false;

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: mapPrismaRoleToApp(user.role),
      permissions,
    });

    const refreshToken = generateSecureToken(48);
    await this.authRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt: rememberMe
        ? this.addDays(new Date(), REFRESH_TOKEN_DAYS_REMEMBER)
        : this.addHours(new Date(), REFRESH_TOKEN_HOURS_SESSION),
      userAgent: meta?.userAgent,
      ipAddress: meta?.ip,
    });

    return {
      user: this.mapUser(user),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: accessExpiresIn,
      },
    };
  }

  private isRememberMeSession(record: { expiresAt: Date; createdAt: Date }): boolean {
    const durationMs = record.expiresAt.getTime() - record.createdAt.getTime();
    return durationMs >= 4 * 24 * 60 * 60 * 1000;
  }

  private addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
