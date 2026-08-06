import { Injectable, Logger } from "@nestjs/common";

import { FALLBACK_EXCHANGE_RATES, type ExchangeRatesSnapshot } from "./exchange-rates.types";

function formatCbarDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function parseCbarRate(xml: string, code: "USD" | "EUR"): number {
  const blockRegex = new RegExp(`<Valute Code="${code}">([\\s\\S]*?)<\\/Valute>`, "i");
  const blockMatch = xml.match(blockRegex);
  if (!blockMatch) {
    throw new Error(`CBAR rate block not found for ${code}`);
  }

  const block = blockMatch[1];
  const nominalMatch = block.match(/<Nominal>([\d.]+)<\/Nominal>/i);
  const valueMatch = block.match(/<Value>([\d.]+)<\/Value>/i);
  if (!nominalMatch || !valueMatch) {
    throw new Error(`CBAR rate values not found for ${code}`);
  }

  const nominal = Number(nominalMatch[1]);
  const value = Number(valueMatch[1]);
  if (!Number.isFinite(nominal) || nominal <= 0 || !Number.isFinite(value) || value <= 0) {
    throw new Error(`CBAR rate invalid for ${code}`);
  }

  return value / nominal;
}

function buildSnapshot(
  dateLabel: string,
  usdToAzn: number,
  eurToAzn: number,
): ExchangeRatesSnapshot {
  return {
    date: dateLabel,
    usdToAzn,
    eurToAzn,
    usdToEur: usdToAzn / eurToAzn,
    source: "cbar",
    fetchedAt: new Date().toISOString(),
  };
}

@Injectable()
export class CbarExchangeService {
  private readonly logger = new Logger(CbarExchangeService.name);
  private cache: ExchangeRatesSnapshot | null = null;
  private cacheDateKey: string | null = null;

  async getRates(): Promise<ExchangeRatesSnapshot> {
    const todayKey = formatCbarDate(new Date());
    if (this.cache && this.cacheDateKey === todayKey) {
      return this.cache;
    }

    try {
      const snapshot = await this.fetchRatesForDate(new Date());
      this.cache = snapshot;
      this.cacheDateKey = todayKey;
      return snapshot;
    } catch (error) {
      this.logger.warn(
        `CBAR rates unavailable for ${todayKey}, trying previous day: ${error instanceof Error ? error.message : error}`,
      );
    }

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const snapshot = await this.fetchRatesForDate(yesterday);
      this.cache = snapshot;
      this.cacheDateKey = todayKey;
      return snapshot;
    } catch (error) {
      this.logger.warn(
        `CBAR fallback rates in use: ${error instanceof Error ? error.message : error}`,
      );
      return FALLBACK_EXCHANGE_RATES;
    }
  }

  private async fetchRatesForDate(date: Date): Promise<ExchangeRatesSnapshot> {
    const formatted = formatCbarDate(date);
    const url = `https://www.cbar.az/currencies/${formatted}.xml`;
    const response = await fetch(url, {
      headers: { Accept: "application/xml,text/xml" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`CBAR HTTP ${response.status}`);
    }

    const xml = await response.text();
    const usdToAzn = parseCbarRate(xml, "USD");
    const eurToAzn = parseCbarRate(xml, "EUR");
    return buildSnapshot(formatted, usdToAzn, eurToAzn);
  }
}
