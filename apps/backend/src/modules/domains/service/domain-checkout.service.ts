import { BadRequestException, Injectable } from "@nestjs/common";

import { DomainsRepository } from "../repository/domains.repository";
import { TldPricingRepository } from "../repository/tld-pricing.repository";

import { RegistrarService } from "./registrar.service";

import { CbarExchangeService } from "@/shared/pricing/cbar-exchange.service";
import { convertLedgerAmount } from "@/shared/pricing/currency-convert.util";
import { parseCurrency } from "@/shared/pricing/currency.util";

export const DOMAIN_PATTERN =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
@Injectable()
export class DomainCheckoutService {
  constructor(
    private readonly pricing: TldPricingRepository,
    private readonly domains: DomainsRepository,
    private readonly registrar: RegistrarService,
    private readonly exchange: CbarExchangeService,
  ) {}

  async quote(name: string, mode: string, currencyCode = "USD") {
    const domain = name.trim().toLowerCase();
    if (domain.length > 253 || !DOMAIN_PATTERN.test(domain))
      throw new BadRequestException("Invalid domain name");
    if (!["register", "transfer"].includes(mode))
      throw new BadRequestException("Invalid domain purchase option");
    if (await this.domains.findByName(domain))
      throw new BadRequestException("Domain is already managed here; choose use existing domain");
    const tld = (await this.pricing.listActive())
      .sort((a, b) => b.tld.length - a.tld.length)
      .find(
        (row) =>
          domain.endsWith(`.${row.tld}`) &&
          domain.slice(0, -row.tld.length - 1).indexOf(".") === -1,
      );
    if (!tld)
      throw new BadRequestException(
        "This domain extension is not available for purchase or transfer",
      );
    const result = (await this.registrar.search(domain)).find(
      (row) => row.domain.toLowerCase() === domain,
    );
    if (!result || result.premium)
      throw new BadRequestException("Domain pricing could not be confirmed");
    if (mode === "register" && !result.available)
      throw new BadRequestException("Domain is not available");
    if (mode === "transfer" && result.available)
      throw new BadRequestException("Domain is not registered; choose a new domain");
    const base = Number(mode === "transfer" ? tld.transferPrice : tld.registerPrice);
    if (!Number.isFinite(base) || base <= 0)
      throw new BadRequestException("Domain pricing is not configured");
    const currency = parseCurrency(currencyCode);
    const price = convertLedgerAmount(base, tld.currency, currency, await this.exchange.getRates());
    return {
      name: domain,
      mode: mode as "register" | "transfer",
      price,
      currency,
      years: 1,
      fulfillment: "STAFF" as const,
    };
  }
}
