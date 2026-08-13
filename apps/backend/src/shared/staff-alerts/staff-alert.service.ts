import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { formatStaffAlertMessage, type StaffAlertPayload } from "./staff-alert.messages";

import { PrismaService } from "@/database/database.module";
import { WhatsappService } from "@/modules/whatsapp/service/whatsapp.service";
import { normalizeWhatsappPhone } from "@/modules/whatsapp/utils/phone.util";

@Injectable()
export class StaffAlertService {
  private readonly logger = new Logger(StaffAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  notify(payload: StaffAlertPayload): void {
    void this.dispatch(payload).catch((error: unknown) => {
      this.logger.warn(
        `Staff WhatsApp alert failed (${payload.kind}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  private async dispatch(payload: StaffAlertPayload): Promise<void> {
    if (!this.whatsapp.isGatewayConnected()) {
      this.logger.debug(`Skip staff alert ${payload.kind}: WhatsApp gateway offline`);
      return;
    }

    const recipients = await this.resolveRecipients();
    if (recipients.length === 0) {
      this.logger.debug(`Skip staff alert ${payload.kind}: no admin phones`);
      return;
    }

    const message = formatStaffAlertMessage(payload);
    for (const recipient of recipients) {
      try {
        await this.whatsapp.sendSystemText({
          phone: recipient.phone,
          userId: recipient.userId,
          message,
        });
      } catch (error: unknown) {
        this.logger.warn(
          `Staff WhatsApp send failed to ${recipient.phone}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private async resolveRecipients(): Promise<{ phone: string; userId?: string }[]> {
    const seen = new Set<string>();
    const out: { phone: string; userId?: string }[] = [];

    const add = (raw: string, userId?: string) => {
      try {
        const phone = normalizeWhatsappPhone(raw);
        if (phone.length < 8 || seen.has(phone)) return;
        seen.add(phone);
        out.push({ phone, userId });
      } catch {
        // ignore invalid numbers
      }
    };

    const extra = this.config.get<string>("STAFF_WHATSAPP_NOTIFY_PHONES") ?? "";
    for (const part of extra.split(/[,\s]+/)) {
      if (part.trim()) add(part.trim());
    }

    const admins = await this.prisma.user.findMany({
      where: {
        role: "ADMIN",
        status: "ACTIVE",
        phone: { not: null },
        whatsappNotificationsEnabled: true,
      },
      select: { id: true, phone: true },
    });

    for (const admin of admins) {
      if (admin.phone) add(admin.phone, admin.id);
    }

    return out;
  }
}
