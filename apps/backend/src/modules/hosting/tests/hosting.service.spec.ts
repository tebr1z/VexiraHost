import { Test, TestingModule } from "@nestjs/testing";

import { HostingRepository } from "../repository/hosting.repository";
import { HostingProvisionRunner } from "../service/hosting-provision.runner";
import { HostingService } from "../service/hosting.service";
import { PanelSessionService } from "../service/panel-session.service";
import { PleskPanelService } from "../service/plesk-panel.service";

import { AuthoritativeDnsService } from "@/modules/domains/service/authoritative-dns.service";
import { TicketsService } from "@/modules/tickets/service/tickets.service";

describe("HostingService", () => {
  let service: HostingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HostingService,
        { provide: HostingRepository, useValue: {} },
        { provide: PanelSessionService, useValue: {} },
        { provide: PleskPanelService, useValue: {} },
        { provide: HostingProvisionRunner, useValue: { enqueue: jest.fn() } },
        { provide: AuthoritativeDnsService, useValue: {} },
        {
          provide: TicketsService,
          useValue: {
            createCancellationForHosting: jest.fn(),
            closeCancellationForHosting: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HostingService>(HostingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
