import { Injectable, Logger } from "@nestjs/common";

import { currencyForCountry, type SupportedCurrency } from "@/shared/pricing/currency.util";

interface GeoCacheEntry {
  countryCode: string;
  currency: SupportedCurrency;
  expiresAt: number;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly cache = new Map<string, GeoCacheEntry>();
  private readonly ttlMs = 60 * 60 * 1000;

  async detectCurrency(ip?: string | null): Promise<{
    countryCode: string | null;
    currency: SupportedCurrency;
    ip: string | null;
  }> {
    const normalizedIp = this.normalizeIp(ip);
    if (!normalizedIp) {
      return { countryCode: null, currency: "USD", ip: null };
    }

    const cached = this.cache.get(normalizedIp);
    if (cached && cached.expiresAt > Date.now()) {
      return { countryCode: cached.countryCode, currency: cached.currency, ip: normalizedIp };
    }

    try {
      const response = await fetch(`https://ipapi.co/${normalizedIp}/json/`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error(`ipapi status ${response.status}`);
      const data = (await response.json()) as { country_code?: string; error?: boolean };
      if (data.error) throw new Error("ipapi error response");
      const countryCode = data.country_code?.toUpperCase() ?? null;
      const currency = currencyForCountry(countryCode);
      this.cache.set(normalizedIp, {
        countryCode: countryCode ?? "",
        currency,
        expiresAt: Date.now() + this.ttlMs,
      });
      return { countryCode, currency, ip: normalizedIp };
    } catch (err) {
      this.logger.warn(`Geo lookup failed for ${normalizedIp}: ${String(err)}`);
      return { countryCode: null, currency: "USD", ip: normalizedIp };
    }
  }

  private normalizeIp(ip?: string | null): string | null {
    if (!ip) return null;
    let value = ip.trim();
    if (value.startsWith("::ffff:")) value = value.slice(7);
    if (value === "::1" || value === "127.0.0.1") return null;
    return value;
  }
}
