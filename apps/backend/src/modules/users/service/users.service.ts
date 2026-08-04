import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type { UpdateBillingAddressDto, UpdatePhoneDto, UpdateUserPreferencesDto } from "../dto";

import { resolveAuthEmailLocale } from "@/modules/auth/email/auth-email.locale";
import { AuthRepository } from "@/modules/auth/repository/auth.repository";
import { normalizeWhatsappPhone } from "@/modules/whatsapp/utils/phone.util";
import { normalizeBillingAddress } from "@/shared/billing/billing-address.util";
import { parseCurrency, parsePeriod } from "@/shared/pricing/currency.util";
import {
  canChangeCurrency,
  CURRENCY_CHANGE_COOLDOWN_DAYS,
  nextCurrencyChangeAt,
} from "@/shared/pricing/user-currency.util";
import { mapPrismaRoleToApp } from "@/utils/role.util";

@Injectable()
export class UsersService {
  constructor(private readonly authRepository: AuthRepository) {}

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

  async updatePreferences(userId: string, dto: UpdateUserPreferencesDto) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const country = dto.countryCode?.toUpperCase();
    if (user.currencyLocked || country === "AZ") {
      if (dto.preferredCurrency && parseCurrency(dto.preferredCurrency) !== "AZN") {
        throw new ForbiddenException("Azerbaijan accounts are fixed to AZN");
      }

      const updated = await this.authRepository.updateCurrencyPreferences(userId, {
        preferredCurrency: "AZN",
        billingPeriod: dto.billingPeriod ? parsePeriod(dto.billingPeriod) : user.billingPeriod,
        currencyLocked: true,
        markCurrencyChanged: false,
      });
      return this.mapProfile(updated);
    }

    if (dto.preferredCurrency) {
      const nextCurrency = parseCurrency(dto.preferredCurrency);
      const currencyChanged = nextCurrency !== user.preferredCurrency;
      if (currencyChanged) {
        if (
          !canChangeCurrency({
            currencyLocked: user.currencyLocked,
            currencyChangedAt: user.currencyChangedAt,
          })
        ) {
          const nextAt = nextCurrencyChangeAt(user.currencyChangedAt);
          throw new BadRequestException(
            `Currency can only be changed every ${CURRENCY_CHANGE_COOLDOWN_DAYS} days` +
              (nextAt ? ` (available after ${nextAt.toISOString()})` : ""),
          );
        }
      }

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
        currencyLocked: user.currencyLocked,
        markCurrencyChanged: false,
      });
      return this.mapProfile(updated);
    }

    return this.mapProfile(user);
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
    createdAt: Date;
  }) {
    const allowed = canChangeCurrency({
      currencyLocked: user.currencyLocked,
      currencyChangedAt: user.currencyChangedAt,
    });
    const nextChange = nextCurrencyChangeAt(user.currencyChangedAt);

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
      phone: user.phone ?? null,
      whatsappNotificationsEnabled: user.whatsappNotificationsEnabled ?? true,
      accountBalance: Number(user.accountBalance ?? 0),
      balanceCurrency: user.balanceCurrency ?? "USD",
      preferredLocale: resolveAuthEmailLocale(user.localeHistory?.[0]),
      localeHistory: (user.localeHistory ?? []).slice(0, 3),
      createdAt: user.createdAt,
    };
  }
}
