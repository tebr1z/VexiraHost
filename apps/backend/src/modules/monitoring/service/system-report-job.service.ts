import { Injectable, Logger } from "@nestjs/common";

import { SystemHealthService } from "./system-health.service";
import { SystemReportEmailService } from "./system-report-email.service";

@Injectable()
export class SystemReportJobService {
  private readonly logger = new Logger(SystemReportJobService.name);

  constructor(
    private readonly health: SystemHealthService,
    private readonly email: SystemReportEmailService,
  ) {}

  async tick(): Promise<void> {
    const snapshot = await this.health.collectSnapshot();
    this.logger.log(
      `System health snapshot: ${snapshot.overall} (${snapshot.items.filter((item) => item.state !== "ok").length} issues)`,
    );
    await this.email.send(snapshot);
  }
}
