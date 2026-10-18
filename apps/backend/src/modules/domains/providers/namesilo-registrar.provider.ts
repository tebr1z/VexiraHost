import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  DomainSearchResult,
  RegistrarDnsRecord,
  RegistrarProvider,
  RegistrarRegistrationResult,
  RegistrarTransferResult,
} from "../interfaces/registrar-provider.interface";
import { TldPricingRepository } from "../repository/tld-pricing.repository";

type NameSiloReply = {
  code?: number | string;
  detail?: string;
  message?: string;
  domain?: unknown;
  available?: unknown;
  unavailable?: unknown;
  invalid?: unknown;
};

type NameSiloResponse = { reply?: NameSiloReply };

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function responseDomains(value: unknown): string[] {
  if (typeof value === "string") return [normalizeDomain(value)];
  if (Array.isArray(value)) return value.flatMap(responseDomains);
  if (!value || typeof value !== "object") return [];
  const row = value as Record<string, unknown>;
  if (typeof row.domain === "string") return [normalizeDomain(row.domain)];
  return Object.values(row).flatMap(responseDomains);
}

function isSuccessCode(code: number | string | undefined): boolean {
  return [300, 301, 302].includes(Number(code));
}

@Injectable()
export class NameSiloRegistrarProvider implements RegistrarProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly tldPricing: TldPricingRepository,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>("registrar.namesilo.apiKey", "").trim());
  }

  private get nameservers(): string[] {
    return this.config.get<string[]>("registrar.namesilo.defaultNameservers") ?? [];
  }

  private async request(operation: string, params: Record<string, string>): Promise<NameSiloReply> {
    const key = this.config.get<string>("registrar.namesilo.apiKey", "").trim();
    if (!key) throw new ServiceUnavailableException("NameSilo API key is not configured");

    const base = this.config
      .get<string>("registrar.namesilo.apiBaseUrl", "https://www.namesilo.com/api")
      .replace(/\/$/, "");
    const url = new URL(`${base}/${operation}`);
    if (url.protocol !== "https:") {
      throw new ServiceUnavailableException("NameSilo API URL must use HTTPS");
    }
    url.searchParams.set("version", "1");
    url.searchParams.set("type", "json");
    url.searchParams.set("key", key);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ServiceUnavailableException("NameSilo API is unreachable");
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(`NameSilo API returned HTTP ${response.status}`);
    }

    const body = (await response.json()) as NameSiloResponse;
    const reply = body.reply;
    if (!reply || !isSuccessCode(reply.code)) {
      throw new BadRequestException(
        `NameSilo request failed: ${reply?.detail ?? reply?.message ?? "invalid response"}`,
      );
    }
    return reply;
  }

  async search(query: string): Promise<DomainSearchResult[]> {
    const normalized = normalizeDomain(query);
    if (!normalized) return [];
    const pricing = await this.tldPricing.listActive();
    const tlds = normalized.includes(".")
      ? [normalized.split(".").at(-1)!]
      : pricing.length
        ? pricing.map((row) => row.tld)
        : ["com", "net", "org", "io"];
    const label = normalized.includes(".")
      ? normalized.split(".").slice(0, -1).join(".")
      : normalized;
    const domains = tlds.map((tld) => `${label}.${tld}`);
    const reply = await this.request("checkRegisterAvailability", { domains: domains.join(",") });
    const available = new Set(responseDomains(reply.available));
    const unavailable = new Set([
      ...responseDomains(reply.unavailable),
      ...responseDomains(reply.invalid),
    ]);
    const prices = new Map(pricing.map((row) => [row.tld, Number(row.registerPrice)]));

    return domains.map((domain, index) => ({
      domain,
      tld: tlds[index]!,
      available: available.has(domain) && !unavailable.has(domain),
      price: prices.get(tlds[index]!) ?? 0,
      currency: "USD",
      premium: false,
    }));
  }

  async register(domain: string): Promise<RegistrarRegistrationResult> {
    const normalized = normalizeDomain(domain);
    if (this.nameservers.length < 2) {
      throw new ServiceUnavailableException("At least two NameSilo nameservers are required");
    }
    const params: Record<string, string> = {
      domain: normalized,
      years: "1",
      private: "1",
      auto_renew: "0",
    };
    this.nameservers.slice(0, 13).forEach((value, index) => {
      params[`ns${index + 1}`] = value;
    });
    const contactId = this.config.get<string>("registrar.namesilo.contactId", "").trim();
    if (contactId) params.contact_id = contactId;
    await this.request("registerDomain", params);
    const expiresAt = new Date();
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
    return {
      registrarRef: `namesilo:${normalized}`,
      expiresAt,
      nameservers: this.nameservers,
    };
  }

  async initiateTransfer(domain: string, authCode: string): Promise<RegistrarTransferResult> {
    const normalized = normalizeDomain(domain);
    if (authCode.trim().length < 6) throw new BadRequestException("Invalid authorization code");
    await this.request("transferDomain", {
      domain: normalized,
      auth: `base64:${Buffer.from(authCode).toString("base64")}`,
      auto_renew: "0",
      private: "1",
    });
    return { registrarRef: `namesilo:${normalized}`, status: "pending" };
  }

  async renew(domain: string, years = 1): Promise<{ expiresAt: Date }> {
    if (!Number.isInteger(years) || years < 1 || years > 10) {
      throw new BadRequestException("Renewal years must be between 1 and 10");
    }
    await this.request("renewDomain", { domain: normalizeDomain(domain), years: String(years) });
    const expiresAt = new Date();
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + years);
    return { expiresAt };
  }

  async updateNameservers(domain: string, nameservers: string[]): Promise<void> {
    if (nameservers.length < 2 || nameservers.length > 13) {
      throw new BadRequestException("NameSilo requires between 2 and 13 nameservers");
    }
    const params: Record<string, string> = { domain: normalizeDomain(domain) };
    nameservers.forEach((value, index) => {
      params[`ns${index + 1}`] = value.trim().toLowerCase();
    });
    await this.request("changeNameServers", params);
  }

  async registerGlue(domain: string, host: string, ip: string): Promise<void> {
    await this.request("addRegisteredNameServer", {
      domain: normalizeDomain(domain),
      new_host: host.trim().toLowerCase(),
      ip1: ip.trim(),
    });
  }

  defaultDnsRecords(domain: string): RegistrarDnsRecord[] {
    return [
      { type: "CNAME", name: "www", value: domain, ttl: 3600 },
      { type: "TXT", name: "@", value: "v=spf1 include:_spf.vexirahost.com ~all", ttl: 3600 },
    ];
  }
}
