import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { AuthRepository } from "@/modules/auth/repository/auth.repository";
import { normalizeBillingAddress } from "@/shared/billing/billing-address.util";
import { mapPrismaRoleToApp } from "@/utils/role.util";
import { parseCurrency, parsePeriod } from "@/shared/pricing/currency.util";
import {
  canChangeCurrency,
  CURRENCY_CHANGE_COOLDOWN_DAYS,
  nextCurrencyChangeAt,
} from "@/shared/pricing/user-currency.util";

import type { UpdateBillingAddressDto, UpdateUserPreferencesDto } from "../dto";

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
    billingAddress?: unknown;
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
      createdAt: user.createdAt,
    };
  }
}
