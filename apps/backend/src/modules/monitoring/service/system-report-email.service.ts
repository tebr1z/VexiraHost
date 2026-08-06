import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { SystemHealthSnapshot } from "../system-report.types";
import { buildSystemReportMail } from "../utils/system-report-email.util";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";

const DEFAULT_REPORT_EMAIL = "hasimovtabriz@gmail.com";

@Injectable()
export class SystemReportEmailService {
  private readonly logger = new Logger(SystemReportEmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly smtp: SmtpMailService,
  ) {}

  private recipient(): string {
    return (
      process.env.SYSTEM_REPORT_EMAIL?.trim() ||
      this.config.get<string>("SYSTEM_REPORT_EMAIL") ||
      DEFAULT_REPORT_EMAIL
    );
  }

  private appUrl(): string {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  }

  isEnabled(): boolean {
    const raw =
      process.env.SYSTEM_REPORT_ENABLED ?? this.config.get<string>("SYSTEM_REPORT_ENABLED");
    if (raw === undefined || raw === "") return true;
    return raw !== "false" && raw !== "0";
  }

  async send(snapshot: SystemHealthSnapshot): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.debug("Hourly system report email is disabled.");
      return;
    }

    const content = buildSystemReportMail(snapshot, this.appUrl());
    const to = this.recipient();

    try {
      await this.smtp.send(to, content, {
        fromName: "Vexira Host Monitoring",
        mailerTag: "Vexira Host System Report",
      });
      this.logger.log(`Hourly system report sent to ${to} (${snapshot.overall})`);
    } catch (error) {
      this.logger.error(
        `Failed to send hourly system report: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
