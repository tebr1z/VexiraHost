import { randomBytes } from "crypto";

import { Injectable } from "@nestjs/common";
import { AddonServiceType, ServiceStatus } from "@prisma/client";

import type {
  AddonProvisionInput,
  AddonProvisionResult,
  AddonProvider,
  ProductDeliveryConfig,
} from "../interfaces/addon-provider.interface";

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash + input.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function parseKeyPool(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function takeLicenseKey(delivery?: ProductDeliveryConfig | null): {
  key: string | null;
  remaining: string | null;
} {
  const pool = parseKeyPool(delivery?.licenseKeys);
  if (pool.length === 0) return { key: null, remaining: null };
  const [first, ...rest] = pool;
  return {
    key: first,
    remaining: rest.length ? rest.join("\n") : "",
  };
}

function resolveDownloadUrl(
  delivery: ProductDeliveryConfig | null | undefined,
  productSlug: string | undefined,
  baseUrl: string,
): string | null {
  const mode = delivery?.deliveryMode ?? "NONE";
  if (mode !== "FILE" && mode !== "KEY_AND_FILE") {
    if (delivery?.downloadUrl) return delivery.downloadUrl;
    return null;
  }
  if (delivery?.downloadUrl) return delivery.downloadUrl;
  if (productSlug) return `${baseUrl}/downloads/${productSlug}`;
  return `${baseUrl}/dashboard/services`;
}

@Injectable()
export class MockAddonProvider implements AddonProvider {
  async provision(input: AddonProvisionInput, appUrl?: string): Promise<AddonProvisionResult> {
    const seed = hashSeed(`${input.type}:${input.name}:${input.identifier ?? ""}`);
    const now = new Date();
    const baseUrl = (appUrl ?? "http://localhost:3000").replace(/\/$/, "");
    const delivery = input.delivery ?? null;

    switch (input.type) {
      case AddonServiceType.LICENSE: {
        const mode = delivery?.deliveryMode ?? "NONE";
        const { key: pooledKey, remaining } = takeLicenseKey(delivery);
        const generated = `VXR-${randomBytes(4).toString("hex").toUpperCase()}-${String(100000 + (seed % 900000))}`;
        const wantsKey = mode === "LICENSE_KEY" || mode === "KEY_AND_FILE" || mode === "NONE";
        const licenseKey = wantsKey ? pooledKey || generated : null;
        const downloadUrl = resolveDownloadUrl(delivery, input.productSlug, baseUrl);

        return {
          identifier: licenseKey ?? input.productSlug ?? input.name,
          status: ServiceStatus.ACTIVE,
          metadata: {
            ...(licenseKey ? { licenseKey } : {}),
            ...(downloadUrl ? { downloadUrl } : {}),
            ...(delivery?.downloadFileName ? { downloadFileName: delivery.downloadFileName } : {}),
            seats: 1 + (seed % 4),
            product: input.name,
            productId: input.productId ?? null,
            productSlug: input.productSlug ?? null,
            deliveryMode: mode,
            isFree: delivery?.isFree ?? false,
            promoText: delivery?.promoText ?? null,
            activationGuideText: delivery?.activationGuideText ?? null,
            activationGuideImageUrl: delivery?.activationGuideImageUrl ?? null,
            activationGuideVideoUrl: delivery?.activationGuideVideoUrl ?? null,
          },
          expiresAt: delivery?.isFree ? null : addYears(now, 1),
          remainingLicenseKeys: pooledKey ? remaining : undefined,
        };
      }
      case AddonServiceType.SSL: {
        const domain =
          input.identifier?.trim().toLowerCase() || `${slugify(input.name)}.example.com`;
        const certId = `ssl-cert-${String(10000 + (seed % 90000))}`;
        return {
          identifier: certId,
          status: ServiceStatus.ACTIVE,
          metadata: {
            certId,
            domain,
            issuer: "Vexira Mock CA",
            validation: "DV",
          },
          expiresAt: addYears(now, 1),
        };
      }
      case AddonServiceType.EMAIL: {
        const localPart = slugify(input.name) || "mailbox";
        const domain = input.identifier?.includes("@")
          ? input.identifier.trim().toLowerCase()
          : `${localPart}@${input.identifier?.trim().toLowerCase() || "vexira.host"}`;
        return {
          identifier: domain,
          status: ServiceStatus.ACTIVE,
          metadata: {
            address: domain,
            quotaMb: 5120 + (seed % 10240),
            webmailUrl: `https://mail.vexira.host/${localPart}`,
          },
          expiresAt: null,
        };
      }
      case AddonServiceType.BACKUP: {
        const schedule = input.identifier?.trim() || "0 2 * * *";
        const scheduleId = `bk-${String(1000 + (seed % 9000))}`;
        return {
          identifier: scheduleId,
          status: ServiceStatus.ACTIVE,
          metadata: {
            scheduleId,
            schedule,
            retentionDays: 7 + (seed % 23),
            timezone: "UTC",
          },
          expiresAt: addMonths(now, 1),
        };
      }
      default:
        throw new Error("Unsupported addon service type");
    }
  }
}
