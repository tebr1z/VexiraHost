import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import type {
  ConfirmTotpDto,
  DisableTotpDto,
  UpdateBillingAddressDto,
  UpdateEmailTwoFactorDto,
  UpdatePhoneDto,
  UpdateUserPreferencesDto,
  VerifyEmailTwoFactorDto,
} from "../dto";

import { resolveAuthEmailLocale } from "@/modules/auth/email/auth-email.locale";
import { AuthRepository } from "@/modules/auth/repository/auth.repository";
import { AuthEmailService } from "@/modules/auth/service/auth-email.service";
import {
  buildTotpQrDataUrl,
  buildTotpUri,
  createTotpSecret,
  verifyTotpCode,
} from "@/modules/auth/utils/totp.util";
import { normalizeWhatsappPhone } from "@/modules/whatsapp/utils/phone.util";
import { normalizeBillingAddress } from "@/shared/billing/billing-address.util";
import { parseCurrency, parsePeriod } from "@/shared/pricing/currency.util";
import { canChangeCurrency } from "@/shared/pricing/user-currency.util";
import { hashToken } from "@/utils/crypto.util";
import { mapPrismaRoleToApp } from "@/utils/role.util";

const SECURITY_OTP_MINUTES = 10;
const SECURITY_OTP_EXPIRES_SECONDS = SECURITY_OTP_MINUTES * 60;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.mapProfile(user);
  }

  async updateBillingAddress(userId: string, dto: UpdateBillingAddressDto) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const address = normalizeBillingAddress(dto.billingAddress);
    if (!address) {
      throw new BadRequestException("Billing address is incomplete");
    }

    const updated = await this.authRepository.updateBillingAddress(userId, address);
    return this.mapProfile(updated);
  }

  async updatePhone(userId: string, dto: UpdatePhoneDto) {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    const normalized = dto.phone?.trim() ? normalizeWhatsappPhone(dto.phone) : null;
    if (normalized && normalized.length < 8) {
      throw new BadRequestException("Phone number is invalid");
    }

    const updated = await this.authRepository.updatePhone(userId, {
      phone: normalized,
      whatsappNotificationsEnabled:
        dto.whatsappNotificationsEnabled ?? user.whatsappNotificationsEnabled,
    });
    return this.mapProfile(updated);
  }

  async requestEmailTwoFactorChange(userId: string, dto: UpdateEmailTwoFactorDto) {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    if (dto.enabled && !user.emailVerifiedAt) {
      throw new BadRequestException("Verify your email before enabling two-factor authentication");
    }

    if (Boolean(user.emailTwoFactorEnabled) === dto.enabled) {
      return {
        alreadyApplied: true as const,
        profile: this.mapProfile(user),
      };
    }

    await this.authRepository.deleteEmailLoginOtps(userId, "EMAIL_2FA");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const challenge = await this.authRepository.createEmailLoginOtp({
      userId,
      code,
      purpose: "EMAIL_2FA",
      desiredEnabled: dto.enabled,
      expiresAt: new Date(Date.now() + SECURITY_OTP_MINUTES * 60 * 1000),
    });

    const locale = resolveAuthEmailLocale(user.localeHistory?.[0]);
    this.logger.log(`Email 2FA change OTP for ${user.email}: ${code}`);
    try {
      await this.authEmailService.sendSecurityOtpEmail(
        user.email,
        code,
        dto.enabled,
        locale,
        user.firstName,
        user.lastName,
      );
    } catch (err) {
      this.logger.error(`Failed to send security OTP to ${user.email}: ${String(err)}`);
      throw new BadRequestException("Could not send verification email. Please try again.");
    }

    return {
      requiresVerification: true as const,
      challengeId: challenge.id,
      expiresIn: SECURITY_OTP_EXPIRES_SECONDS,
      emailHint: this.maskEmail(user.email),
      desiredEnabled: dto.enabled,
    };
  }

  async verifyEmailTwoFactorChange(userId: string, dto: VerifyEmailTwoFactorDto) {
    const challenge = await this.authRepository.findEmailLoginOtp(dto.challengeId, "EMAIL_2FA");
    if (!challenge || challenge.userId !== userId) {
      throw new BadRequestException("Invalid or expired verification code");
    }

    if (hashToken(dto.code.trim()) !== challenge.codeHash) {
      throw new BadRequestException("Invalid or expired verification code");
    }

    if (typeof challenge.desiredEnabled !== "boolean") {
      throw new BadRequestException("Invalid verification session");
    }

    await this.authRepository.consumeEmailLoginOtp(challenge.id);
    await this.authRepository.deleteEmailLoginOtps(userId, "EMAIL_2FA");

    if (!challenge.desiredEnabled) {
      await this.authRepository.deleteEmailLoginOtps(userId, "LOGIN");
    }

    const updated = await this.authRepository.updateEmailTwoFactor(
      userId,
      challenge.desiredEnabled,
    );
    return this.mapProfile(updated);
  }

  async setupTotp(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    if (user.totpEnabled) {
      throw new BadRequestException("Authenticator is already enabled");
    }

    const secret = createTotpSecret();
    await this.authRepository.updateTotp(userId, {
      totpSecret: secret,
      totpEnabled: false,
    });

    const otpauthUrl = buildTotpUri(user.email, secret);
    const qrCodeDataUrl = await buildTotpQrDataUrl(otpauthUrl);

    return {
      otpauthUrl,
      qrCodeDataUrl,
      secret,
      issuer: "Vexira Host",
    };
  }

  async confirmTotp(userId: string, dto: ConfirmTotpDto) {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    if (!user.totpSecret) {
      throw new BadRequestException("Start authenticator setup first");
    }
    if (user.totpEnabled) {
      return this.mapProfile(user);
    }
    if (!verifyTotpCode(user.totpSecret, dto.code)) {
      throw new BadRequestException("Invalid authenticator code");
    }

    const updated = await this.authRepository.updateTotp(userId, {
      totpEnabled: true,
      totpSecret: user.totpSecret,
    });
    return this.mapProfile(updated);
  }

  async disableTotp(userId: string, dto: DisableTotpDto) {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    if (!user.totpEnabled || !user.totpSecret) {
      const cleared = await this.authRepository.updateTotp(userId, {
        totpEnabled: false,
        totpSecret: null,
      });
      return this.mapProfile(cleared);
    }
    if (!verifyTotpCode(user.totpSecret, dto.code)) {
      throw new BadRequestException("Invalid authenticator code");
    }

    const updated = await this.authRepository.updateTotp(userId, {
      totpEnabled: false,
      totpSecret: null,
    });
    return this.mapProfile(updated);
  }

  async cancelTotpSetup(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    if (user.totpEnabled) {
      throw new BadRequestException("Authenticator is already enabled — use disable instead");
    }
    const updated = await this.authRepository.updateTotp(userId, {
      totpEnabled: false,
      totpSecret: null,
    });
    return this.mapProfile(updated);
  }

  async updatePreferences(userId: string, dto: UpdateUserPreferencesDto) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (dto.preferredCurrency) {
      const nextCurrency = parseCurrency(dto.preferredCurrency);
      const currencyChanged = nextCurrency !== user.preferredCurrency;

      const updated = await this.authRepository.updateCurrencyPreferences(userId, {
        preferredCurrency: nextCurrency,
        billingPeriod: dto.billingPeriod ? parsePeriod(dto.billingPeriod) : user.billingPeriod,
        currencyLocked: false,
        markCurrencyChanged: currencyChanged,
      });
      return this.mapProfile(updated);
    }

    if (dto.billingPeriod) {
      const updated = await this.authRepository.updateCurrencyPreferences(userId, {
        preferredCurrency: parseCurrency(user.preferredCurrency),
        billingPeriod: parsePeriod(dto.billingPeriod),
        currencyLocked: false,
        markCurrencyChanged: false,
      });
      return this.mapProfile(updated);
    }

    return this.mapProfile(user);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  private mapProfile(user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: Parameters<typeof mapPrismaRoleToApp>[0];
    emailVerifiedAt: Date | null;
    status: string;
    preferredCurrency: string | null;
    billingPeriod: string | null;
    currencyLocked: boolean;
    currencyChangedAt: Date | null;
    localeHistory?: string[];
    accountBalance?: { toString(): string } | null;
    balanceCurrency?: string | null;
    billingAddress?: unknown;
    phone?: string | null;
    whatsappNotificationsEnabled?: boolean;
    emailTwoFactorEnabled?: boolean;
    totpEnabled?: boolean;
    createdAt: Date;
  }) {
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
      whatsappNotificationsEnabled: user.whatsappNotificationsEnabled ?? true,
      emailTwoFactorEnabled: user.emailTwoFactorEnabled ?? false,
      totpEnabled: user.totpEnabled ?? false,
      accountBalance: Number(user.accountBalance ?? 0),
      balanceCurrency: user.balanceCurrency ?? "USD",
      preferredLocale: resolveAuthEmailLocale(user.localeHistory?.[0]),
      localeHistory: (user.localeHistory ?? []).slice(0, 3),
      createdAt: user.createdAt,
    };
  }
}
