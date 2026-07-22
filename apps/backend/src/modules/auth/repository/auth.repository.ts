import { Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";
import { UserStatus } from "@prisma/client";

import { PrismaService } from "@/database/database.module";
import { hashToken } from "@/utils/crypto.util";

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(data: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    preferredCurrency?: string;
    currencyLocked?: boolean;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        preferredCurrency: data.preferredCurrency,
        currencyLocked: data.currencyLocked ?? false,
        currencyChangedAt: data.preferredCurrency ? new Date() : undefined,
      },
    });
  }

  updateCurrencyPreferences(
    userId: string,
    data: {
      preferredCurrency: string;
      billingPeriod?: string | null;
      currencyLocked?: boolean;
      /** When true, bumps the 30-day change cooldown. */
      markCurrencyChanged?: boolean;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        preferredCurrency: data.preferredCurrency,
        billingPeriod: data.billingPeriod ?? undefined,
        currencyLocked: data.currencyLocked,
        ...(data.markCurrencyChanged ? { currencyChangedAt: new Date() } : {}),
      },
    });
  }

  updateUserStatus(id: string, status: UserStatus, emailVerifiedAt?: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        status,
        emailVerifiedAt,
      },
    });
  }

  updatePassword(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  updateBillingAddress(
    userId: string,
    billingAddress: {
      fullName: string;
      line1: string;
      city: string;
      region: string;
      postalCode: string;
      country: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { billingAddress },
    });
  }

  createRefreshToken(data: {
    userId: string;
    token: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: hashToken(data.token),
        expiresAt: data.expiresAt,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
      },
    });
  }

  findRefreshToken(token: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  revokeRefreshToken(token: string): Promise<void> {
    return this.prisma.refreshToken
      .updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .then(() => undefined);
  }

  revokeAllUserRefreshTokens(userId: string): Promise<void> {
    return this.prisma.refreshToken
      .updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .then(() => undefined);
  }

  createEmailVerificationToken(userId: string, token: string, expiresAt: Date) {
    return this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
      },
    });
  }

  findEmailVerificationToken(token: string) {
    return this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  findEmailVerificationTokenAny(token: string) {
    return this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash: hashToken(token),
      },
      include: { user: true },
    });
  }

  deleteEmailVerificationTokens(userId: string): Promise<void> {
    return this.prisma.emailVerificationToken
      .deleteMany({ where: { userId } })
      .then(() => undefined);
  }

  createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    return this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
      },
    });
  }

  findPasswordResetToken(token: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  markPasswordResetTokenUsed(id: string): Promise<void> {
    return this.prisma.passwordResetToken
      .update({
        where: { id },
        data: { usedAt: new Date() },
      })
      .then(() => undefined);
  }

  findOAuthAccount(provider: "GOOGLE" | "GITHUB", providerId: string) {
    return this.prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });
  }

  findUserOAuthAccount(userId: string, provider: "GOOGLE" | "GITHUB") {
    return this.prisma.oAuthAccount.findFirst({
      where: { userId, provider },
    });
  }

  createOAuthAccount(userId: string, provider: "GOOGLE" | "GITHUB", providerId: string) {
    return this.prisma.oAuthAccount.create({
      data: { userId, provider, providerId },
    });
  }

  createOAuthUser(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    emailVerified: boolean;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.emailVerified ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION,
        emailVerifiedAt: data.emailVerified ? new Date() : null,
      },
    });
  }

  getLinkedOAuthProviders(userId: string) {
    return this.prisma.oAuthAccount.findMany({
      where: { userId },
      select: { provider: true, createdAt: true },
    });
  }
}
