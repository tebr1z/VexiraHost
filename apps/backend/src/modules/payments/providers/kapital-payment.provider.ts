import { Injectable, Logger } from "@nestjs/common";

import {
  KapitalConfigService,
  type ResolvedKapitalConfig,
} from "../service/kapital-config.service";

export interface KapitalCreateOrderInput {
  amount: number;
  currency: string;
  description: string;
  language?: string;
  redirectUrl?: string;
}

export interface KapitalCreateOrderResult {
  id: number;
  password: string;
  secret?: string;
  hppUrl: string;
  redirectUrl: string;
  status?: string;
}

export interface KapitalOrderStatus {
  id: number;
  status: string;
  amount: number;
  currency: string;
  password?: string;
}

const PAID_STATUSES = new Set(["FullyPaid", "Fully paid", "Authorized", "Closed"]);

@Injectable()
export class KapitalPaymentProvider {
  private readonly logger = new Logger(KapitalPaymentProvider.name);

  constructor(private readonly kapitalConfigService: KapitalConfigService) {}

  private authHeader(config: ResolvedKapitalConfig): string {
    return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
  }

  async isConfigured(): Promise<boolean> {
    const config = await this.kapitalConfigService.resolve();
    return Boolean(config.username && config.password);
  }

  buildHppUrl(hppUrl: string, id: number, password: string): string {
    const trimmed = hppUrl.replace(/\/$/, "");
    const base =
      trimmed.endsWith("/flex") || trimmed.includes("/flex?")
        ? trimmed
        : `${trimmed}/flex`;
    const url = new URL(base.includes("://") ? base : `https://${base}`);
    url.searchParams.set("id", String(id));
    url.searchParams.set("password", password);
    return url.toString();
  }

  async createPurchaseOrder(input: KapitalCreateOrderInput): Promise<KapitalCreateOrderResult> {
    const config = await this.kapitalConfigService.resolve();
    if (!config.username || !config.password) {
      throw new Error("Kapital Bank credentials are not configured");
    }

    const currency = input.currency.toUpperCase();
    if (currency !== "AZN" && currency !== "USD") {
      throw new Error(
        `Kapital Bank supports AZN and USD only (got ${currency}). Change checkout currency.`,
      );
    }

    const body = {
      order: {
        typeRid: "Order_SMS",
        amount: Number(input.amount).toFixed(2),
        currency,
        description: input.description.slice(0, 1000),
        language: input.language ?? config.language,
        hppRedirectUrl: input.redirectUrl ?? config.redirectUrl,
      },
    };

    const response = await fetch(`${config.baseUrl}/api/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: this.authHeader(config),
      },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    type KapitalCreateOrderPayload = {
      order?: {
        id: number;
        password: string;
        secret?: string;
        hppUrl: string;
        status?: string;
      };
      errorDescription?: string;
      errorCode?: string;
      error?: string;
      message?: string;
    };

    let payload: KapitalCreateOrderPayload | null = null;
    try {
      payload = rawText ? (JSON.parse(rawText) as KapitalCreateOrderPayload) : null;
    } catch {
      payload = null;
    }

    if (!response.ok || !payload?.order) {
      const reason = this.formatKapitalError(
        response.status,
        response.statusText,
        payload,
        rawText,
        config.baseUrl,
        config.environment,
      );
      this.logger.error(
        `Kapital create order failed [${config.environment} @ ${config.baseUrl}]: ${reason}`,
      );
      throw new Error(`Kapital Bank create order failed: ${reason}`);
    }

    const order = payload.order;
    return {
      id: Number(order.id),
      password: order.password,
      secret: order.secret,
      hppUrl: order.hppUrl,
      status: order.status,
      redirectUrl: this.buildHppUrl(order.hppUrl, Number(order.id), order.password),
    };
  }

  private formatKapitalError(
    status: number,
    statusText: string,
    payload: {
      errorDescription?: string;
      errorCode?: string;
      error?: string;
      message?: string;
    } | null,
    rawText: string,
    baseUrl: string,
    environment?: string,
  ): string {
    const fromJson =
      payload?.errorDescription ||
      payload?.errorCode ||
      payload?.error ||
      payload?.message ||
      null;

    if (fromJson) return fromJson;

    const looksHtml = /^\s*</.test(rawText) || /cloudflare|cf-ray/i.test(rawText);
    if (status === 520 || status === 521 || status === 522 || looksHtml) {
      const envHint = environment === "test"
        ? "Check admin panel: Test should use txpgtst.kapitalbank.az."
        : "Production merchant may need Ecommerce API activation.";
      return (
        `HTTP ${status} from Kapital gateway (no JSON body). ` +
        `${envHint} ` +
        `Host: ${baseUrl}`
      );
    }

    if (status === 401 || status === 403) {
      return `HTTP ${status}: invalid merchant login/password or access denied`;
    }

    const textHint = rawText.trim().slice(0, 160).replace(/\s+/g, " ");
    return (
      `HTTP ${status}${statusText ? ` ${statusText}` : ""}` +
      (textHint ? ` — ${textHint}` : " — empty response from bank")
    );
  }

  async getOrderStatus(id: number, password: string): Promise<KapitalOrderStatus> {
    const config = await this.kapitalConfigService.resolve();
    if (!config.username || !config.password) {
      throw new Error("Kapital Bank credentials are not configured");
    }

    const url = new URL(`${config.baseUrl}/api/order/${id}`);
    url.searchParams.set("password", password);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: this.authHeader(config),
        Accept: "application/json",
      },
    });

    const payload = (await response.json().catch(() => null)) as {
      order?: {
        id: number;
        status: string;
        amount: number;
        currency: string;
        password?: string;
      };
      errorDescription?: string;
    } | null;

    if (!response.ok || !payload?.order) {
      const reason = payload?.errorDescription ?? response.statusText;
      throw new Error(`Kapital Bank order status failed: ${reason}`);
    }

    return {
      id: Number(payload.order.id),
      status: payload.order.status,
      amount: Number(payload.order.amount),
      currency: payload.order.currency,
      password: payload.order.password,
    };
  }

  async getDetailedOrderStatus(
    id: number,
    password: string,
  ): Promise<KapitalOrderStatus & { declineReason?: string }> {
    const config = await this.kapitalConfigService.resolve();
    if (!config.username || !config.password) {
      throw new Error("Kapital Bank credentials are not configured");
    }

    const url = new URL(`${config.baseUrl}/api/order/${id}`);
    url.searchParams.set("password", password);
    url.searchParams.set("tranDetailLevel", "2");
    url.searchParams.set("tokenDetailLevel", "2");
    url.searchParams.set("orderDetailLevel", "2");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: this.authHeader(config),
        Accept: "application/json",
      },
    });

    const payload = (await response.json().catch(() => null)) as {
      order?: {
        id: number;
        status: string;
        amount: number;
        currency: string;
        password?: string;
        trans?: Array<{
          declineReason?: string;
          pmoDeclineDescription?: string;
          pmoResultCode?: string;
        }>;
      };
      errorDescription?: string;
    } | null;

    if (!response.ok || !payload?.order) {
      const reason = payload?.errorDescription ?? response.statusText;
      throw new Error(`Kapital Bank detailed order status failed: ${reason}`);
    }

    const lastTran = payload.order.trans?.[payload.order.trans.length - 1];
    const declineReason =
      lastTran?.pmoDeclineDescription ??
      lastTran?.declineReason ??
      (lastTran?.pmoResultCode ? `code ${lastTran.pmoResultCode}` : undefined);

    return {
      id: Number(payload.order.id),
      status: payload.order.status,
      amount: Number(payload.order.amount),
      currency: payload.order.currency,
      password: payload.order.password,
      declineReason,
    };
  }

  isPaidStatus(status: string): boolean {
    return PAID_STATUSES.has(status);
  }

  async getReturnUrl(): Promise<string> {
    const config = await this.kapitalConfigService.resolve();
    return config.returnUrl;
  }

  encodeGatewayRef(kapitalOrderId: number, password: string): string {
    return `kapital:${kapitalOrderId}:${password}`;
  }

  parseGatewayRef(gatewayRef: string | null | undefined): {
    kapitalOrderId: number;
    password: string;
  } | null {
    if (!gatewayRef?.startsWith("kapital:")) return null;
    const parts = gatewayRef.split(":");
    if (parts.length < 3) return null;
    const kapitalOrderId = Number(parts[1]);
    const password = parts.slice(2).join(":");
    if (!Number.isFinite(kapitalOrderId) || !password) return null;
    return { kapitalOrderId, password };
  }
}
