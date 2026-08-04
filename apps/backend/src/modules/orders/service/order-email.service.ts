import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";
import {
  createBrandEmail,
  infoRow,
  infoTable,
  noticeBlock,
  primaryButton,
} from "@/shared/email/transactional-template.util";

const DEFAULT_NOTIFY_EMAIL = "hasimovtabriz@gmail.com";

@Injectable()
export class OrderEmailService {
  private readonly logger = new Logger(OrderEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly smtpMailService: SmtpMailService,
  ) {}

  private notifyEmail(): string {
    return (
      process.env.ORDER_ADMIN_NOTIFY_EMAIL?.trim() ||
      this.configService.get<string>("ORDER_ADMIN_NOTIFY_EMAIL") ||
      DEFAULT_NOTIFY_EMAIL
    );
  }

  private adminOrderUrl(orderId: string): string {
    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    return `${appUrl}/t4abriz/panel/orders/${orderId}`;
  }

  async sendOrderCreatedNotification(input: {
    orderId: string;
    customerEmail: string;
    customerName: string;
    currency: string;
    subtotal: number;
    discountAmount: number;
    total: number;
    promoCode?: string | null;
    items: Array<{ productName: string; quantity: number; totalPrice: number }>;
  }): Promise<void> {
    const to = this.notifyEmail();
    const money = (amount: number) => `${amount.toFixed(2)} ${input.currency}`;
    const itemsHtml = input.items
      .map(
        (item) =>
          `<li style="margin:0 0 6px;font-size:14px;color:#333;">${escapeHtml(item.productName)} × ${item.quantity} — <strong>${escapeHtml(money(item.totalPrice))}</strong></li>`,
      )
      .join("");

    const bodyHtml = [
      noticeBlock(
        "Yeni sipariş oluşturuldu",
        `${input.customerName} (${input.customerEmail}) yeni bir sipariş verdi. Detayları admin panelinden kontrol edin.`,
        "info",
      ),
      infoTable(
        infoRow("Sipariş ID", input.orderId.slice(0, 12).toUpperCase()) +
          infoRow("Müşteri", `${input.customerName} (${input.customerEmail})`) +
          infoRow("Ara toplam", money(input.subtotal)) +
          (input.discountAmount > 0
            ? infoRow(
                "İndirim",
                `${money(input.discountAmount)}${input.promoCode ? ` (${input.promoCode})` : ""}`,
              )
            : "") +
          infoRow("Toplam", money(input.total)),
      ),
      `<p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#1a1a1a;">Ürünler</p>`,
      `<ul style="margin:0;padding-left:18px;">${itemsHtml || "<li>—</li>"}</ul>`,
      primaryButton("Siparişi aç", this.adminOrderUrl(input.orderId)),
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: "Sipariş bildirimi",
      appUrl: this.adminOrderUrl(input.orderId),
      title: "Yeni sipariş oluşturuldu",
      subtitle: `${input.customerEmail} — ${money(input.total)}`,
      bodyHtml,
      footer: "Bu e-posta yeni müşteri siparişi oluşturulduğunda gönderilir.",
    });

    content.subject = `Vexira Host • Yeni sipariş — ${input.customerEmail} (${money(input.total)})`;
    content.text = [
      "Yeni sipariş oluşturuldu",
      `Müşteri: ${input.customerName} (${input.customerEmail})`,
      `Sipariş: ${input.orderId}`,
      `Toplam: ${money(input.total)}`,
      ...input.items.map(
        (item) => `- ${item.productName} × ${item.quantity}: ${money(item.totalPrice)}`,
      ),
      `Admin: ${this.adminOrderUrl(input.orderId)}`,
    ].join("\n");

    try {
      await this.smtpMailService.send(to, content);
    } catch (err) {
      this.logger.error(`Failed to send order created notification to ${to}`, err);
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
