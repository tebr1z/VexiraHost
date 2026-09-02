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
import type { AuthUser } from "@vexira/types";
import { UserRole } from "@vexira/types";
import * as bcrypt from "bcryptjs";

import type {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  ResendLoginOtpDto,
  VerifyLoginOtpDto,
} from "../dto";
import { resolveAuthEmailLocale, mergeLocaleHistory } from "../email/auth-email.locale";
import { AuthRepository } from "../repository/auth.repository";
import type { AuthResponse, AuthUserResponse, LoginResult } from "../types";

import { AuthEmailService } from "./auth-email.service";
import { LoginAttemptService } from "./login-attempt.service";
import { SiteAccessService } from "./site-access.service";
import { TurnstileService } from "./turnstile.service";

import { verifyTotpCode } from "@/modules/auth/utils/totp.util";
import { normalizeBillingAddress } from "@/shared/billing/billing-address.util";
import { resolveRegisterCurrency, canChangeCurrency } from "@/shared/pricing/user-currency.util";
import { generateSecureToken, hashToken } from "@/utils/crypto.util";
import { mapPrismaRoleToApp } from "@/utils/role.util";

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_DAYS_REMEMBER = 7;
const REFRESH_TOKEN_HOURS_SESSION = 36;
const EMAIL_VERIFY_HOURS = 24;
const PASSWORD_RESET_HOURS = 1;
const LOGIN_OTP_MINUTES = 10;
const LOGIN_OTP_EXPIRES_SECONDS = LOGIN_OTP_MINUTES * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authEmailService: AuthEmailService,
    private readonly loginAttemptService: LoginAttemptService,
    private readonly turnstileService: TurnstileService,
    private readonly siteAccessService: SiteAccessService,
  ) {}

  async register(
    dto: RegisterDto,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthResponse> {
    await this.siteAccessService.assertRegisterOpen();
    await this.turnstileService.assertValid(dto.turnstileToken, "signup", meta?.ip);

    const existing = await this.authRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const currencyPrefs = resolveRegisterCurrency({
      preferredCurrency: dto.preferredCurrency,
      countryCode: dto.countryCode,
    });
    const locale = resolveAuthEmailLocale(dto.locale);
    let phone: string | null = null;
    if (dto.phone?.trim()) {
      // Already composed E.164 digits from client (dial + national); digits only.
      phone = dto.phone.replace(/\D/g, "");
      if (phone.length < 8 || phone.length > 15) {
        throw new BadRequestException("Phone number is invalid");
      }
    }
    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      preferredCurrency: currencyPrefs.currency,
      currencyLocked: currencyPrefs.locked,
      marketingOptIn: dto.marketingOptIn ?? true,
      unsubscribeToken: generateSecureToken(24),
      localeHistory: mergeLocaleHistory([], locale),
      phone,
    });

    const verifyToken = generateSecureToken();
    await this.authRepository.createEmailVerificationToken(
      user.id,
      verifyToken,
      this.addHours(new Date(), EMAIL_VERIFY_HOURS),
    );

    this.logger.log(`Email verification token for ${user.email}: ${verifyToken}`);
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

  async login(dto: LoginDto, meta?: { userAgent?: string; ip?: string }): Promise<LoginResult> {
    if (this.loginAttemptService.requiresCaptcha(dto.email, meta?.ip)) {
      await this.turnstileService.assertValid(dto.turnstileToken, "login", meta?.ip);
    }
    const locale = resolveAuthEmailLocale(dto.locale);
    if (this.loginAttemptService.isLocked(dto.email)) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const user = await this.authRepository.findByEmail(dto.email);
    await this.siteAccessService.assertLoginOpen(user?.role);
    if (!user?.passwordHash) {
      this.loginAttemptService.recordFailure(dto.email, meta?.ip);
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException("Account is suspended");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const shouldAlert = this.loginAttemptService.recordFailure(user.email, meta?.ip);
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
    const withLocale = await this.recordLocaleQuietly(user.id, user.localeHistory, dto.locale);
    const sessionUser = withLocale ?? user;

    return this.completeLoginOrTwoFactor(sessionUser, meta, {
      rememberMe: dto.rememberMe ?? false,
      locale,
    });
  }

  async verifyLoginOtp(
    dto: VerifyLoginOtpDto,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthResponse> {
    const challenge = await this.authRepository.findEmailLoginOtp(dto.challengeId);
    if (!challenge) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    if (challenge.purpose === "TOTP_LOGIN") {
      const secret = challenge.user.totpSecret;
      if (!challenge.user.totpEnabled || !secret || !verifyTotpCode(secret, dto.code)) {
        throw new UnauthorizedException("Invalid or expired verification code");
      }
    } else if (challenge.purpose === "LOGIN") {
      if (hashToken(dto.code.trim()) !== challenge.codeHash) {
        throw new UnauthorizedException("Invalid or expired verification code");
      }
    } else {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    if (challenge.user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException("Account is suspended");
    }

    await this.authRepository.consumeEmailLoginOtp(challenge.id);
    await this.authRepository.deleteEmailLoginOtps(challenge.userId, challenge.purpose);

    const withLocale = await this.recordLocaleQuietly(
      challenge.user.id,
      challenge.user.localeHistory,
      dto.locale,
    );

    return this.buildAuthResponse(withLocale ?? challenge.user, meta, {
      rememberMe: challenge.rememberMe,
    });
  }

  async resendLoginOtp(dto: ResendLoginOtpDto): Promise<{
    requiresTwoFactor: true;
    method: "EMAIL";
    challengeId: string;
    expiresIn: number;
    emailHint: string;
  }> {
    const existing = await this.authRepository.findEmailLoginOtp(dto.challengeId, "LOGIN");
    if (!existing) {
      throw new UnauthorizedException("Invalid or expired verification session");
    }

    const locale = resolveAuthEmailLocale(dto.locale ?? existing.user.localeHistory?.[0]);
    return this.startEmailTwoFactorChallenge(existing.user, {
      rememberMe: existing.rememberMe,
      locale,
    });
  }

  private async startTotpChallenge(
    user: User,
    options: { rememberMe: boolean },
  ): Promise<{
    requiresTwoFactor: true;
    method: "TOTP";
    challengeId: string;
    expiresIn: number;
    emailHint: string;
  }> {
    await this.authRepository.deleteEmailLoginOtps(user.id, "TOTP_LOGIN");
    const challenge = await this.authRepository.createEmailLoginOtp({
      userId: user.id,
      code: `totp-${generateSecureToken(8)}`,
      rememberMe: options.rememberMe,
      purpose: "TOTP_LOGIN",
      expiresAt: this.addMinutes(new Date(), LOGIN_OTP_MINUTES),
    });

    return {
      requiresTwoFactor: true,
      method: "TOTP",
      challengeId: challenge.id,
      expiresIn: LOGIN_OTP_EXPIRES_SECONDS,
      emailHint: this.maskEmail(user.email),
    };
  }

  private async startEmailTwoFactorChallenge(
    user: User,
    options: { rememberMe: boolean; locale: string },
  ): Promise<{
    requiresTwoFactor: true;
    method: "EMAIL";
    challengeId: string;
    expiresIn: number;
    emailHint: string;
  }> {
    await this.authRepository.deleteEmailLoginOtps(user.id, "LOGIN");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const challenge = await this.authRepository.createEmailLoginOtp({
      userId: user.id,
      code,
      rememberMe: options.rememberMe,
      purpose: "LOGIN",
      expiresAt: this.addMinutes(new Date(), LOGIN_OTP_MINUTES),
    });

    this.logger.log(`Login OTP for ${user.email}: ${code}`);
    try {
      await this.authEmailService.sendLoginOtpEmail(
        user.email,
        code,
        options.locale,
        user.firstName,
        user.lastName,
      );
    } catch (err) {
      this.logger.error(`Failed to send login OTP to ${user.email}: ${String(err)}`);
      throw new BadRequestException("Could not send verification email. Please try again.");
    }

    return {
      requiresTwoFactor: true,
      method: "EMAIL",
      challengeId: challenge.id,
      expiresIn: LOGIN_OTP_EXPIRES_SECONDS,
      emailHint: this.maskEmail(user.email),
    };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  async recordPreferredLocale(userId: string, locale?: string | null) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      return { preferredLocale: "en" as const, localeHistory: [] as string[] };
    }
    const updated = await this.recordLocaleQuietly(user.id, user.localeHistory, locale);
    const history = updated?.localeHistory ?? user.localeHistory ?? [];
    return {
      preferredLocale: resolveAuthEmailLocale(history[0]),
      localeHistory: history.slice(0, 3),
    };
  }

  private async recordLocaleQuietly(
    userId: string,
    current: string[] | null | undefined,
    locale?: string | null,
  ) {
    try {
      const next = mergeLocaleHistory(current, locale);
      const same =
        next.length === (current?.length ?? 0) &&
        next.every((value, index) => value === current?.[index]);
      if (same) {
        return null;
      }
      return await this.authRepository.updateLocaleHistory(userId, next);
    } catch (error) {
      this.logger.warn(
        `Could not update locale history for ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  async refresh(
    refreshToken: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthResponse> {
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
      await this.authEmailService.sendVerificationEmail(
        user.email,
        verifyToken,
        resolveAuthEmailLocale(user.localeHistory?.[0]),
      );
    } catch (err) {
      this.logger.error(`Failed to resend verification email to ${user.email}: ${String(err)}`);
    }

    return { message: "Verification email sent" };
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    meta?: { ip?: string },
  ): Promise<{ message: string }> {
    await this.turnstileService.assertValid(dto.turnstileToken, "forgot-password", meta?.ip);
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
      await this.authEmailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        resolveAuthEmailLocale(user.localeHistory?.[0]),
      );
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${user.email}: ${String(err)}`);
    }

    return { message: "If the email exists, a reset link has been sent" };
  }

  async resetPassword(dto: ResetPasswordDto, meta?: { ip?: string }): Promise<{ message: string }> {
    await this.turnstileService.assertValid(dto.turnstileToken, "reset-password", meta?.ip);
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
  ): Promise<LoginResult> {
    const locale = resolveAuthEmailLocale(meta?.locale);
    const existingOAuth = await this.authRepository.findOAuthAccount(
      profile.provider,
      profile.providerId,
    );

    if (existingOAuth?.user) {
      if (existingOAuth.user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException("Account is suspended");
      }
      await this.siteAccessService.assertLoginOpen(existingOAuth.user.role);
      const withLocale = await this.recordLocaleQuietly(
        existingOAuth.user.id,
        existingOAuth.user.localeHistory,
        meta?.locale,
      );
      // OAuth proves Google identity only — still require app 2FA when enabled.
      return this.completeLoginOrTwoFactor(withLocale ?? existingOAuth.user, meta, {
        rememberMe: true,
        locale,
      });
    }

    const existingUser = await this.authRepository.findByEmail(profile.email);
    let user: User;
    let isNewGoogleAccount = false;
    let isGoogleAccountLinked = false;

    if (existingUser) {
      if (existingUser.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException("Account is suspended");
      }
      await this.siteAccessService.assertLoginOpen(existingUser.role);

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
      await this.siteAccessService.assertRegisterOpen();
      user = await this.authRepository.createOAuthUser({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        emailVerified: profile.emailVerified,
        marketingOptIn: true,
        unsubscribeToken: generateSecureToken(24),
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

    const withLocale = await this.recordLocaleQuietly(user.id, user.localeHistory, meta?.locale);
    return this.completeLoginOrTwoFactor(withLocale ?? user, meta, {
      rememberMe: true,
      locale,
    });
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

    const targetRole = mapPrismaRoleToApp(target.role);
    if (targetRole === UserRole.ADMIN || targetRole === UserRole.STAFF) {
      throw new ForbiddenException("Cannot impersonate staff accounts");
    }

    if (target.status === UserStatus.SUSPENDED) {
      throw new BadRequestException("Cannot impersonate suspended accounts");
    }

    this.logger.warn(
      `Admin ${actor.email} (${actor.id}) impersonating ${target.email} (${target.id})`,
    );

    return this.buildAuthResponse(target, meta);
  }

  buildOAuthRedirectUrl(result: LoginResult, provider?: "google" | "github"): string {
    const base = this.configService.get<string>(
      "oauth.frontendCallbackUrl",
      "http://localhost:3000/auth/callback",
    );
    const url = new URL(base);
    if ("requiresTwoFactor" in result && result.requiresTwoFactor === true) {
      url.searchParams.set("requiresTwoFactor", "1");
      url.searchParams.set("challengeId", result.challengeId);
      url.searchParams.set("method", result.method);
      url.searchParams.set("emailHint", result.emailHint);
      url.searchParams.set("expiresIn", String(result.expiresIn));
      if (provider) {
        url.searchParams.set("provider", provider);
      }
      return url.toString();
    }

    const session = result as AuthResponse;
    const fragment = new URLSearchParams();
    fragment.set("accessToken", session.tokens.accessToken);
    fragment.set("refreshToken", session.tokens.refreshToken);
    if (provider) {
      fragment.set("provider", provider);
    }
    url.hash = fragment.toString();
    return url.toString();
  }

  /** Prefer TOTP over email when both are enabled. Always re-read flags from DB. */
  private async completeLoginOrTwoFactor(
    user: User,
    meta: { userAgent?: string; ip?: string } | undefined,
    options: { rememberMe: boolean; locale: string },
  ): Promise<LoginResult> {
    const fresh = (await this.authRepository.findById(user.id)) ?? user;

    if (fresh.totpEnabled) {
      this.logger.log(`Login 2FA challenge (TOTP) for user ${fresh.id}`);
      return this.startTotpChallenge(fresh, { rememberMe: options.rememberMe });
    }
    if (fresh.emailTwoFactorEnabled) {
      this.logger.log(`Login 2FA challenge (EMAIL) for user ${fresh.id}`);
      return this.startEmailTwoFactorChallenge(fresh, {
        rememberMe: options.rememberMe,
        locale: options.locale,
      });
    }
    return this.buildAuthResponse(fresh, meta, { rememberMe: options.rememberMe });
  }

  mapUser(user: User): AuthUserResponse {
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
      nextCurrencyChangeAt: null,
      billingAddress: normalizeBillingAddress(user.billingAddress),
      phone: user.phone ?? null,
      phoneVerified: Boolean(user.phoneVerifiedAt),
      phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
      whatsappNotificationsEnabled: user.whatsappNotificationsEnabled,
      emailTwoFactorEnabled: user.emailTwoFactorEnabled,
      totpEnabled: user.totpEnabled,
      accountBalance: Number(user.accountBalance ?? 0),
      balanceCurrency: user.balanceCurrency ?? "USD",
      preferredLocale: resolveAuthEmailLocale(user.localeHistory?.[0]),
      localeHistory: (user.localeHistory ?? []).slice(0, 3),
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

    let sessionUser = user;
    if (meta?.ip?.trim()) {
      try {
        sessionUser = await this.authRepository.updateLastLogin(user.id, meta.ip.trim());
      } catch (err) {
        this.logger.warn(`Failed to persist lastLoginIp for ${user.id}: ${String(err)}`);
      }
    }

    const accessToken = await this.jwtService.signAsync({
      sub: sessionUser.id,
      email: sessionUser.email,
      role: mapPrismaRoleToApp(sessionUser.role),
      permissions,
    });

    const refreshToken = generateSecureToken(48);
    await this.authRepository.createRefreshToken({
      userId: sessionUser.id,
      token: refreshToken,
      expiresAt: rememberMe
        ? this.addDays(new Date(), REFRESH_TOKEN_DAYS_REMEMBER)
        : this.addHours(new Date(), REFRESH_TOKEN_HOURS_SESSION),
      userAgent: meta?.userAgent,
      ipAddress: meta?.ip,
    });

    return {
      user: this.mapUser(sessionUser),
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
