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
  trace_id?: string;
}

export interface EpointResponse extends EpointCallbackPayload {
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
}

export interface EpointReadiness {
  configured: boolean;
  ready: boolean;
  baseUrl: string;
  resultUrl: string;
  issues: string[];
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
      resultUrl: string;
      language: string;
      allowInsecure: boolean;
    }>("payment.epoint");
    return {
      publicKey: configured?.publicKey?.trim() ?? "",
      privateKey: configured?.privateKey?.trim() ?? "",
      baseUrl: (configured?.baseUrl ?? "https://epoint.az/api/1").replace(/\/$/, ""),
      returnUrl: configured?.returnUrl ?? "http://localhost:3000/payment/result",
      cardReturnUrl: configured?.cardReturnUrl ?? "http://localhost:3000/dashboard/payments",
      resultUrl: configured?.resultUrl ?? "http://localhost:4000/api/v1/payments/epoint/callback",
      language: (["az", "en", "ru"].includes(configured?.language ?? "az")
        ? configured?.language
        : "az") as EpointLanguage,
      allowInsecure: configured?.allowInsecure === true,
    };
  }

  isConfigured(): boolean {
    const settings = this.settings();
    return Boolean(settings.publicKey && settings.privateKey);
  }

  getReturnUrl(): string {
    return this.settings().returnUrl;
  }

  getReadiness(): EpointReadiness {
    const settings = this.settings();
    const issues: string[] = [];
    if (!settings.publicKey) issues.push("EPOINT_PUBLIC_KEY is missing");
    if (!settings.privateKey) issues.push("EPOINT_PRIVATE_KEY is missing");

    for (const [label, value] of [
      ["EPOINT_BASE_URL", settings.baseUrl],
      ["EPOINT_RETURN_URL", settings.returnUrl],
      ["EPOINT_CARD_RETURN_URL", settings.cardReturnUrl],
      ["EPOINT_RESULT_URL", settings.resultUrl],
    ] as const) {
      try {
        const url = new URL(value);
        const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
        if (url.protocol !== "https:" && !(settings.allowInsecure && local)) {
          issues.push(`${label} must use HTTPS`);
        }
      } catch {
        issues.push(`${label} is not a valid URL`);
      }
    }

    return {
      configured: this.isConfigured(),
      ready: issues.length === 0,
      baseUrl: settings.baseUrl,
      resultUrl: settings.resultUrl,
      issues,
    };
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

  private async post(
    path: string,
    payload: Record<string, unknown>,
    allowFailedStatus = false,
  ): Promise<EpointResponse> {
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
    if (
      !response.ok ||
      (!allowFailedStatus && (parsed.status === "error" || parsed.status === "failed"))
    ) {
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

  async getPaymentStatus(transaction: string): Promise<EpointResponse> {
    const settings = this.settings();
    return this.post(
      "get-status",
      {
        public_key: settings.publicKey,
        language: settings.language,
        transaction,
      },
      true,
    );
  }

  decodeAndVerifyCallback(data: string, suppliedSignature: string): EpointCallbackPayload {
    if (!data || !suppliedSignature) throw new Error("Missing Epoint callback signature");
    const expected = Buffer.from(this.signature(data), "utf8");
    const supplied = Buffer.from(suppliedSignature, "utf8");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      throw new Error("Invalid Epoint callback signature");
    }
    try {
      const decoded = JSON.parse(
        Buffer.from(data, "base64").toString("utf8"),
      ) as EpointCallbackPayload;
      if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
        throw new Error("Invalid Epoint callback payload");
      }
      return decoded;
    } catch {
      throw new Error("Invalid Epoint callback payload");
    }
  }
}
