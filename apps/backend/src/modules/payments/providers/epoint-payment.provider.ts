import { createHash, timingSafeEqual } from "node:crypto";

import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type EpointLanguage = "az" | "en" | "ru";

export interface EpointCallbackPayload {
  status?: string;
  code?: string;
  message?: string;
  transaction?: string;
  card_id?: string;
  bank_transaction?: string;
  bank_response?: string;
  operation_code?: string | number;
  rrn?: string;
  card_name?: string;
  card_mask?: string;
  amount?: string | number;
  order_id?: string;
  other_attr?: unknown;
}

interface EpointResponse {
  status?: string;
  message?: string;
  transaction?: string;
  redirect_url?: string;
  card_id?: string;
  bank_transaction?: string;
  bank_response?: string;
  rrn?: string;
  card_name?: string;
  card_mask?: string;
  amount?: string | number;
}

@Injectable()
export class EpointPaymentProvider {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const configured = this.config.get<{
      publicKey: string;
      privateKey: string;
      baseUrl: string;
      returnUrl: string;
      cardReturnUrl: string;
      language: string;
    }>("payment.epoint");
    return {
      publicKey: configured?.publicKey?.trim() ?? "",
      privateKey: configured?.privateKey?.trim() ?? "",
      baseUrl: (configured?.baseUrl ?? "https://epoint.az/api/1").replace(/\/$/, ""),
      returnUrl: configured?.returnUrl ?? "http://localhost:3000/payment/result",
      cardReturnUrl: configured?.cardReturnUrl ?? "http://localhost:3000/dashboard/payments",
      language: (["az", "en", "ru"].includes(configured?.language ?? "az")
        ? configured?.language
        : "az") as EpointLanguage,
    };
  }

  isConfigured(): boolean {
    const settings = this.settings();
    return Boolean(settings.publicKey && settings.privateKey);
  }

  getReturnUrl(): string {
    return this.settings().returnUrl;
  }

  private signature(data: string): string {
    const { privateKey } = this.settings();
    return createHash("sha1")
      .update(`${privateKey}${data}${privateKey}`, "utf8")
      .digest()
      .toString("base64");
  }

  private encode(payload: Record<string, unknown>): { data: string; signature: string } {
    const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    return { data, signature: this.signature(data) };
  }

  private async post(path: string, payload: Record<string, unknown>): Promise<EpointResponse> {
    if (!this.isConfigured()) {
      throw new BadRequestException("Epoint payment is not configured");
    }

    const { baseUrl } = this.settings();
    const body = new URLSearchParams(this.encode(payload));
    const response = await fetch(`${baseUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const raw = await response.text();
    let parsed: EpointResponse;
    try {
      parsed = JSON.parse(raw) as EpointResponse;
    } catch {
      throw new Error(`Epoint returned an invalid response (${response.status})`);
    }
    if (!response.ok || parsed.status === "error" || parsed.status === "failed") {
      throw new Error(parsed.message || `Epoint request failed (${response.status})`);
    }
    return parsed;
  }

  async createPayment(input: {
    orderId: string;
    amount: number;
    description: string;
  }): Promise<{ transaction: string; redirectUrl: string }> {
    const settings = this.settings();
    const successUrl = new URL(settings.returnUrl);
    successUrl.searchParams.set("ok", "1");
    const errorUrl = new URL(settings.returnUrl);
    errorUrl.searchParams.set("ok", "0");
    errorUrl.searchParams.set("reason", "epoint_failed");
    const result = await this.post("request", {
      public_key: settings.publicKey,
      amount: input.amount.toFixed(2),
      currency: "AZN",
      order_id: input.orderId,
      description: input.description.slice(0, 1000),
      language: settings.language,
      success_redirect_url: successUrl.toString(),
      error_redirect_url: errorUrl.toString(),
    });
    if (!result.transaction || !result.redirect_url) {
      throw new Error("Epoint payment response is missing transaction data");
    }
    return { transaction: result.transaction, redirectUrl: result.redirect_url };
  }

  async registerCard(description: string): Promise<{ cardId: string; redirectUrl: string }> {
    const settings = this.settings();
    const successUrl = new URL(settings.cardReturnUrl);
    successUrl.searchParams.set("card", "success");
    const errorUrl = new URL(settings.cardReturnUrl);
    errorUrl.searchParams.set("card", "failed");
    const result = await this.post("card-registration", {
      public_key: settings.publicKey,
      language: settings.language,
      refund: 0,
      description: description.slice(0, 1000),
      success_redirect_url: successUrl.toString(),
      error_redirect_url: errorUrl.toString(),
    });
    if (!result.card_id || !result.redirect_url) {
      throw new Error("Epoint card registration response is incomplete");
    }
    return { cardId: result.card_id, redirectUrl: result.redirect_url };
  }

  async executeSavedCard(input: {
    cardId: string;
    orderId: string;
    amount: number;
    description: string;
  }): Promise<EpointResponse> {
    const settings = this.settings();
    return this.post("execute-pay", {
      public_key: settings.publicKey,
      language: settings.language,
      card_id: input.cardId,
      order_id: input.orderId,
      amount: input.amount.toFixed(2),
      currency: "AZN",
      description: input.description.slice(0, 1000),
    });
  }

  decodeAndVerifyCallback(data: string, suppliedSignature: string): EpointCallbackPayload {
    if (!data || !suppliedSignature) throw new Error("Missing Epoint callback signature");
    const expected = Buffer.from(this.signature(data), "utf8");
    const supplied = Buffer.from(suppliedSignature, "utf8");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      throw new Error("Invalid Epoint callback signature");
    }
    try {
      return JSON.parse(Buffer.from(data, "base64").toString("utf8")) as EpointCallbackPayload;
    } catch {
      throw new Error("Invalid Epoint callback payload");
    }
  }
}
