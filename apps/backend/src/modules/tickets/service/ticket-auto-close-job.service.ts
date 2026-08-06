import { Injectable, Logger } from "@nestjs/common";
import { TicketStatus } from "@prisma/client";

import { TicketsRepository } from "../repository/tickets.repository";

import { TicketEmailService } from "./ticket-email.service";

/** Close tickets when the customer does not reply after the last staff message. */
export const TICKET_CUSTOMER_REPLY_TIMEOUT_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class TicketAutoCloseJobService {
  private readonly logger = new Logger(TicketAutoCloseJobService.name);
  private running = false;

  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly ticketEmailService: TicketEmailService,
  ) {}

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const cutoff = new Date(Date.now() - TICKET_CUSTOMER_REPLY_TIMEOUT_MS);
      const stale = await this.ticketsRepository.findStaleAwaitingCustomer(cutoff);
      if (stale.length === 0) return;

      this.logger.log(`Auto-closing ${stale.length} ticket(s) with no customer reply for 12h`);

      for (const ticket of stale) {
        try {
          const previousStatus = ticket.status;
          if (previousStatus === TicketStatus.CLOSED || previousStatus === TicketStatus.RESOLVED) {
            continue;
          }

          const updated = await this.ticketsRepository.updateStatus(ticket.id, TicketStatus.CLOSED);
          if (updated.user) {
            await this.ticketEmailService.sendTicketAutoClosedEmail({
              to: updated.user.email,
              firstName: updated.user.firstName,
              lastName: updated.user.lastName,
              preferredCurrency: updated.user.preferredCurrency,
              localeHistory: updated.user.localeHistory,
              ticketId: updated.id,
              subject: updated.subject,
            });
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
