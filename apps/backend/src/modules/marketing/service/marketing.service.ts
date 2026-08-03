import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CampaignStatus } from "@prisma/client";

import type { CreateCampaignDto, UpdateCampaignDto } from "../dto/campaign.dto";
import { MarketingRepository } from "../repository/marketing.repository";

import { CampaignEmailService } from "./campaign-email.service";

function mapCampaign(row: {
  id: string;
  subject: string;
  previewText: string | null;
  bodyHtml: string;
  bodyText: string | null;
  status: CampaignStatus;
  sentAt: Date | null;
  recipientCount: number;
  successCount: number;
  failCount: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    subject: row.subject,
    previewText: row.previewText,
    bodyHtml: row.bodyHtml,
    bodyText: row.bodyText,
    status: row.status,
    sentAt: row.sentAt,
    recipientCount: row.recipientCount,
    successCount: row.successCount,
    failCount: row.failCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly repository: MarketingRepository,
    private readonly campaignEmailService: CampaignEmailService,
  ) {}

  async listCampaigns() {
    const [rows, subscriberCount] = await Promise.all([
      this.repository.listCampaigns(),
      this.repository.countMarketingSubscribers(),
    ]);
    return {
      subscriberCount,
      campaigns: rows.map(mapCampaign),
    };
  }

  async listSubscribers(filter: "subscribed" | "unsubscribed" | "all" = "all", q?: string) {
    const [rows, subscriberCount, unsubscribedCount] = await Promise.all([
      this.repository.listCustomersForMarketing(filter, q),
      this.repository.countMarketingSubscribers(),
      this.repository.countMarketingUnsubscribed(),
    ]);

    return {
      filter,
      subscriberCount,
      unsubscribedCount,
      total: rows.length,
      subscribers: rows.map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        status: row.status,
        marketingOptIn: row.marketingOptIn,
        marketingOptInAt: row.marketingOptInAt,
        createdAt: row.createdAt,
      })),
    };
  }

  async setSubscriberOptIn(userId: string, marketingOptIn: boolean) {
    const updated = await this.repository.setMarketingOptIn(userId, marketingOptIn);
    if (!updated) throw new NotFoundException("Customer not found");
    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      status: updated.status,
      marketingOptIn: updated.marketingOptIn,
      marketingOptInAt: updated.marketingOptInAt,
      createdAt: updated.createdAt,
    };
  }

  async getCampaign(id: string) {
    const row = await this.repository.findCampaignById(id);
    if (!row) throw new NotFoundException("Campaign not found");
    return mapCampaign(row);
  }

  async createCampaign(dto: CreateCampaignDto) {
    const row = await this.repository.createCampaign(dto);
    return mapCampaign(row);
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const existing = await this.repository.findCampaignById(id);
    if (!existing) throw new NotFoundException("Campaign not found");
    if (existing.status === CampaignStatus.SENDING) {
      throw new BadRequestException("Cannot edit a campaign that is currently sending");
    }
    if (existing.status === CampaignStatus.SENT) {
      throw new BadRequestException("Cannot edit a campaign that was already sent");
    }

    const row = await this.repository.updateCampaign(id, {
      subject: dto.subject?.trim(),
      previewText: dto.previewText === undefined ? undefined : dto.previewText?.trim() || null,
      bodyHtml: dto.bodyHtml,
      bodyText: dto.bodyText === undefined ? undefined : dto.bodyText?.trim() || null,
    });
    return mapCampaign(row);
  }

  async deleteCampaign(id: string) {
    const existing = await this.repository.findCampaignById(id);
    if (!existing) throw new NotFoundException("Campaign not found");
    if (existing.status === CampaignStatus.SENDING) {
      throw new BadRequestException("Cannot delete a campaign that is currently sending");
    }
    await this.repository.deleteCampaign(id);
    return { ok: true };
  }

  async sendCampaign(id: string) {
    const campaign = await this.repository.findCampaignById(id);
    if (!campaign) throw new NotFoundException("Campaign not found");
    if (campaign.status === CampaignStatus.SENDING) {
      throw new BadRequestException("Campaign is already sending");
    }
    if (campaign.status === CampaignStatus.SENT) {
      throw new BadRequestException("Campaign was already sent");
    }

    const recipients = await this.repository.listMarketingRecipients();
    await this.repository.setCampaignStatus(id, CampaignStatus.SENDING, {
      recipientCount: recipients.length,
      successCount: 0,
      failCount: 0,
    });

    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        const token = await this.repository.ensureUnsubscribeToken(
          recipient.id,
          recipient.unsubscribeToken,
        );
        await this.campaignEmailService.sendCampaignEmail({
          to: recipient.email,
          firstName: recipient.firstName,
          subject: campaign.subject,
          previewText: campaign.previewText,
          bodyHtml: campaign.bodyHtml,
          bodyText: campaign.bodyText,
          unsubscribeToken: token,
        });
        successCount += 1;
      } catch (err) {
        failCount += 1;
        this.logger.warn(`Failed campaign ${id} → ${recipient.email}: ${String(err)}`);
      }
    }

    const finalStatus =
      successCount === 0 && recipients.length > 0 ? CampaignStatus.FAILED : CampaignStatus.SENT;

    const updated = await this.repository.setCampaignStatus(id, finalStatus, {
      sentAt: new Date(),
      recipientCount: recipients.length,
      successCount,
      failCount,
    });

    return mapCampaign(updated);
  }

  async unsubscribe(token: string) {
    const cleaned = token.trim();
    if (!cleaned) throw new BadRequestException("Unsubscribe token is required");

    const user = await this.repository.unsubscribeByToken(cleaned);
    if (!user) throw new NotFoundException("Invalid unsubscribe link");

    return {
      ok: true,
      email: user.email,
      marketingOptIn: user.marketingOptIn,
      message: user.marketingOptIn
        ? "Still subscribed"
        : "You have been unsubscribed from campaign emails",
    };
  }
}
