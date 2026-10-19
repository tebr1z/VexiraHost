import { Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@prisma/client";

import { getTicketEmailCopy } from "../email/ticket-email.i18n";
import { TicketsRepository } from "../repository/tickets.repository";

import { TicketEmailService } from "./ticket-email.service";

import { PrismaService } from "@/database/database.module";
import { resolveUserEmailLocale } from "@/modules/auth/email/auth-email.locale";

/** Default lifetime for an open ticket, measured from its creation time. */
export const DEFAULT_TICKET_AUTO_CLOSE_HOURS = 12;
export const TICKET_AUTO_CLOSE_HOURS_KEY = "ticket_auto_close_hours";

@Injectable()
export class TicketAutoCloseJobService {
  private readonly logger = new Logger(TicketAutoCloseJobService.name);
  private running = false;

  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly ticketEmailService: TicketEmailService,
    private readonly prisma: PrismaService,
  ) {}

  async resolveTimeoutMs(): Promise<{ hours: number; ms: number }> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: TICKET_AUTO_CLOSE_HOURS_KEY },
    });
    const parsed = Number.parseInt(row?.value ?? "", 10);
    const hours =
      Number.isFinite(parsed) && parsed >= 1
        ? Math.min(parsed, 720)
        : DEFAULT_TICKET_AUTO_CLOSE_HOURS;
    return { hours, ms: hours * 60 * 60 * 1000 };
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const { hours, ms } = await this.resolveTimeoutMs();
      const cutoff = new Date(Date.now() - ms);
      const expired = await this.ticketsRepository.findExpiredOpenTickets(cutoff);
      if (expired.length === 0) return;

      this.logger.log(`Auto-closing ${expired.length} ticket(s) older than ${hours}h`);

      for (const ticket of expired) {
        try {
          const updated = await this.ticketsRepository.closeIfActive(ticket.id);
          if (!updated) continue;

          if (updated.user) {
            const locale = resolveUserEmailLocale({
              localeHistory: updated.user.localeHistory,
            });
            const copy = getTicketEmailCopy(locale).autoClosed;
            const name =
              [updated.user.firstName, updated.user.lastName].filter(Boolean).join(" ").trim() ||
              updated.user.email.split("@")[0] ||
              updated.user.email;

            const [notificationResult] = await Promise.allSettled([
              this.prisma.notification.create({
                data: {
                  userId: updated.user.id,
                  type: NotificationType.SYSTEM,
                  title: copy.title,
                  body: copy.subtitle(name, updated.subject, hours),
                  reference: updated.id,
                  href: `/dashboard/tickets/${updated.id}`,
                  meta: {
                    ticketId: updated.id,
                    reason: "AUTO_CLOSE_LIFETIME",
                    autoCloseHours: hours,
                  },
                },
              }),
              this.ticketEmailService.sendTicketAutoClosedEmail({
                to: updated.user.email,
                firstName: updated.user.firstName,
                lastName: updated.user.lastName,
                preferredCurrency: updated.user.preferredCurrency,
                localeHistory: updated.user.localeHistory,
                ticketId: updated.id,
                subject: updated.subject,
                hours,
              }),
            ]);
            if (notificationResult.status === "rejected") {
              this.logger.warn(
                `Ticket close notification ${updated.id} failed: ${
                  notificationResult.reason instanceof Error
                    ? notificationResult.reason.message
                    : String(notificationResult.reason)
                }`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failed to auto-close ticket ${ticket.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Ticket auto-close tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
