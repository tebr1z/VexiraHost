import { Injectable } from "@nestjs/common";

import type {
  DomainSearchResult,
  RegistrarDnsRecord,
  RegistrarProvider,
  RegistrarRegistrationResult,
  RegistrarTransferResult,
} from "../interfaces/registrar-provider.interface";
import { TldPricingRepository } from "../repository/tld-pricing.repository";

const FALLBACK_TLD_PRICING: Record<string, number> = {
  com: 9.99,
  net: 11.99,
  org: 10.99,
  io: 39.99,
  ai: 69.0,
  dev: 14.99,
  app: 17.99,
};

const DEFAULT_TLDS = ["com", "net", "org", "io"];

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function parseDomain(input: string): { label: string; tld?: string } {
  const cleaned = normalizeQuery(input);
  if (!cleaned) return { label: "" };

  if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    const tld = parts.pop() ?? "";
    const label = parts.join(".");
    return { label, tld };
  }

  return { label: cleaned };
}

function isAvailable(domain: string): boolean {
  const reserved = ["google", "facebook", "admin", "vexira", "localhost", "test"];
  const label = domain.split(".")[0] ?? "";
  if (reserved.includes(label)) return false;
  if (label.length < 2) return false;

  let hash = 0;
  for (let i = 0; i < domain.length; i += 1) {
    hash = (hash + domain.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash % 4 !== 0;
}

@Injectable()
export class MockRegistrarProvider implements RegistrarProvider {
  constructor(private readonly tldPricingRepository: TldPricingRepository) {}

  private async getPriceMap(): Promise<Map<string, number>> {
    const rows = await this.tldPricingRepository.listActive();
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.tld, Number(row.registerPrice));
    }
    for (const [tld, price] of Object.entries(FALLBACK_TLD_PRICING)) {
      if (!map.has(tld)) map.set(tld, price);
    }
    return map;
  }

  private async getDefaultTlds(): Promise<string[]> {
    const rows = await this.tldPricingRepository.listActive();
    if (rows.length === 0) return DEFAULT_TLDS;
    return rows.map((row) => row.tld);
  }

  async search(query: string): Promise<DomainSearchResult[]> {
    const { label, tld } = parseDomain(query);
    if (!label) return [];

    const priceMap = await this.getPriceMap();
    const tlds = tld ? [tld] : await this.getDefaultTlds();

    return tlds.map((ext) => {
      const domain = `${label}.${ext}`;
      const premium = ext === "ai" || label.length <= 3;
      const basePrice = priceMap.get(ext) ?? 12.99;
      return {
        domain,
        tld: ext,
        available: isAvailable(domain),
        price: premium ? basePrice * 2 : basePrice,
        currency: "USD",
        premium,
      };
    });
  }

  async register(domain: string): Promise<RegistrarRegistrationResult> {
    const normalized = normalizeQuery(domain);
    if (!isAvailable(normalized)) {
      throw new Error("Domain is not available");
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    return {
      registrarRef: `mock-reg-${Date.now()}`,
      expiresAt,
      nameservers: ["ns1.vexira.host", "ns2.vexira.host"],
    };
  }

  async initiateTransfer(domain: string, authCode: string): Promise<RegistrarTransferResult> {
    if (authCode.trim().length < 6) {
      throw new Error("Invalid authorization code");
    }

    return {
      registrarRef: `mock-xfer-${Date.now()}`,
      status: "pending",
    };
  }

  defaultDnsRecords(domain: string): RegistrarDnsRecord[] {
    return [
      { type: "A", name: "@", value: "192.0.2.10", ttl: 3600 },
      { type: "CNAME", name: "www", value: domain, ttl: 3600 },
      { type: "MX", name: "@", value: `mail.${domain}`, ttl: 3600, priority: 10 },
      { type: "TXT", name: "@", value: "v=spf1 include:_spf.vexira.host ~all", ttl: 3600 },
    ];
  }
}
