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

  async detectCurrency(
    ip?: string | null,
    headerCountry?: string | null,
  ): Promise<{
    countryCode: string | null;
    currency: SupportedCurrency;
    ip: string | null;
  }> {
    const normalizedIp = this.normalizeIp(ip);
    const headerCode = this.normalizeCountry(headerCountry);

    if (!normalizedIp && !headerCode) {
      return { countryCode: null, currency: "USD", ip: null };
    }

    if (normalizedIp) {
      const cached = this.cache.get(normalizedIp);
      if (cached && cached.expiresAt > Date.now() && cached.countryCode) {
        return {
          countryCode: cached.countryCode,
          currency: cached.currency,
          ip: normalizedIp,
        };
      }
    }

    // Cloudflare / reverse-proxy country is often more reliable than free IP APIs.
    if (headerCode) {
      const currency = currencyForCountry(headerCode);
      if (normalizedIp) {
        this.cache.set(normalizedIp, {
          countryCode: headerCode,
          currency,
          expiresAt: Date.now() + this.ttlMs,
        });
      }
      return { countryCode: headerCode, currency, ip: normalizedIp };
    }

    if (!normalizedIp) {
      return { countryCode: null, currency: "USD", ip: null };
    }

    const countryCode =
      (await this.lookupIpApiCo(normalizedIp)) ??
      (await this.lookupIpWhoIs(normalizedIp)) ??
      (await this.lookupIpApiCom(normalizedIp));

    const currency = currencyForCountry(countryCode);
    if (countryCode) {
      this.cache.set(normalizedIp, {
        countryCode,
        currency,
        expiresAt: Date.now() + this.ttlMs,
      });
    } else {
      this.logger.warn(`Geo lookup returned no country for ${normalizedIp}`);
    }

    return { countryCode, currency, ip: normalizedIp };
  }

  private normalizeCountry(code?: string | null): string | null {
    if (!code) return null;
    const upper = code.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper) || upper === "XX" || upper === "T1") return null;
    return upper;
  }

  private async lookupIpApiCo(ip: string): Promise<string | null> {
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(3500),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await response.json()) as {
        country_code?: string;
        error?: boolean;
        reason?: string;
      };
      if (data.error) throw new Error(data.reason ?? "ipapi error");
      return this.normalizeCountry(data.country_code);
    } catch (err) {
      this.logger.warn(`ipapi.co failed for ${ip}: ${String(err)}`);
      return null;
    }
  }

  private async lookupIpWhoIs(ip: string): Promise<string | null> {
    try {
      const response = await fetch(`https://ipwho.is/${ip}`, {
        signal: AbortSignal.timeout(3500),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await response.json()) as {
        success?: boolean;
        country_code?: string;
      };
      if (data.success === false) throw new Error("ipwho.is unsuccessful");
      return this.normalizeCountry(data.country_code);
    } catch (err) {
      this.logger.warn(`ipwho.is failed for ${ip}: ${String(err)}`);
      return null;
    }
  }

  private async lookupIpApiCom(ip: string): Promise<string | null> {
    try {
      // Free tier is HTTP-only; used as last fallback for datacenter IPs.
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`, {
        signal: AbortSignal.timeout(3500),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await response.json()) as {
        status?: string;
        countryCode?: string;
      };
      if (data.status !== "success") throw new Error("ip-api unsuccessful");
      return this.normalizeCountry(data.countryCode);
    } catch (err) {
      this.logger.warn(`ip-api.com failed for ${ip}: ${String(err)}`);
      return null;
    }
  }

  private normalizeIp(ip?: string | null): string | null {
    if (!ip) return null;
    let value = ip.trim();
    if (value.startsWith("::ffff:")) value = value.slice(7);
    if (value === "::1" || value === "127.0.0.1") return null;
    // Strip port from IPv4 "x.x.x.x:port"
    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(value)) {
      value = value.split(":")[0] ?? value;
    }
    return value || null;
  }
}
