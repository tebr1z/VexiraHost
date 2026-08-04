import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "@/database/database.module";
import { WhatsappService } from "@/modules/whatsapp/service/whatsapp.service";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

function reminderCopy(
  locale: string | undefined,
  input: {
    invoiceNumber: string;
    total: number;
    currency: string;
    dueDate: Date;
    url: string;
  },
): string {
  const due = input.dueDate.toLocaleDateString(locale || "tr");
  const amount = formatMoney(input.total, input.currency);
  if (locale === "az") {
    return `Vexira Host: ${input.invoiceNumber} nömrəli ${amount} məbləğində fakturanızın son ödəniş tarixi sabahdır (${due}). Ödəniş: ${input.url}`;
  }
  if (locale === "ru") {
    return `Vexira Host: срок оплаты счёта ${input.invoiceNumber} на сумму ${amount} истекает завтра (${due}). Оплатить: ${input.url}`;
  }
  if (locale === "en") {
    return `Vexira Host: invoice ${input.invoiceNumber} for ${amount} is due tomorrow (${due}). Pay now: ${input.url}`;
  }
  return `Vexira Host: ${input.invoiceNumber} numaralı ${amount} tutarındaki faturanızın son ödeme tarihi yarın (${due}). Ödeme: ${input.url}`;
}

@Injectable()
export class InvoiceReminderJobService {
  private readonly logger = new Logger(InvoiceReminderJobService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + ONE_DAY_MS);
      const invoices = await this.prisma.invoice.findMany({
        where: {
          status: "OPEN",
          dueDate: { gt: now, lte: tomorrow },
          reminder1dSentAt: null,
          user: {
            phone: { not: null },
            whatsappNotificationsEnabled: true,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              localeHistory: true,
            },
          },
          payments: {
            where: { status: "COMPLETED" },
            select: { amount: true },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 100,
      });

      const appUrl = this.config.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
      for (const invoice of invoices) {
        if (!invoice.user.phone) continue;
        const amountPaid = invoice.payments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0,
        );
        const amountDue = Math.max(0, Number((Number(invoice.total) - amountPaid).toFixed(2)));
        if (amountDue === 0) continue;
        try {
          await this.whatsapp.sendSystemText({
            phone: invoice.user.phone,
            userId: invoice.user.id,
            message: reminderCopy(invoice.user.localeHistory[0], {
              invoiceNumber: invoice.invoiceNumber,
              total: amountDue,
              currency: invoice.currency,
              dueDate: invoice.dueDate,
              url: `${appUrl}/dashboard/invoices/${invoice.id}`,
            }),
          });
          await this.prisma.invoice.updateMany({
            where: { id: invoice.id, reminder1dSentAt: null, status: "OPEN" },
            data: { reminder1dSentAt: new Date() },
          });
        } catch (error) {
          this.logger.warn(
            `Invoice reminder ${invoice.id} failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      if (invoices.length > 0) {
        this.logger.log(`Processed ${invoices.length} one-day invoice reminders`);
      }
    } finally {
      this.running = false;
    }
  }
}
