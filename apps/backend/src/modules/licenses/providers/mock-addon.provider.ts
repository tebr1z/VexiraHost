import { Injectable } from "@nestjs/common";
import { AddonServiceType, ServiceStatus } from "@prisma/client";
import { randomBytes } from "crypto";

import type {
  AddonProvisionInput,
  AddonProvisionResult,
  AddonProvider,
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

@Injectable()
export class MockAddonProvider implements AddonProvider {
  async provision(input: AddonProvisionInput, appUrl?: string): Promise<AddonProvisionResult> {
    const seed = hashSeed(`${input.type}:${input.name}:${input.identifier ?? ""}`);
    const now = new Date();
    const baseUrl = (appUrl ?? "http://localhost:3000").replace(/\/$/, "");
    const downloadUrl = input.productSlug
      ? `${baseUrl}/downloads/${input.productSlug}`
      : `${baseUrl}/dashboard/services`;

    switch (input.type) {
      case AddonServiceType.LICENSE: {
        const segment = randomBytes(4).toString("hex").toUpperCase();
        const licenseKey = `VXR-${segment}-${String(100000 + (seed % 900000))}`;
        return {
          identifier: licenseKey,
          status: ServiceStatus.ACTIVE,
          metadata: {
            licenseKey,
            seats: 1 + (seed % 4),
            product: input.name,
            downloadUrl,
          },
          expiresAt: addYears(now, 1),
        };
      }
      case AddonServiceType.SSL: {
        const domain = input.identifier?.trim().toLowerCase() || `${slugify(input.name)}.example.com`;
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
