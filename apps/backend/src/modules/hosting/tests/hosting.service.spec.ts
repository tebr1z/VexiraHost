import { Test, TestingModule } from "@nestjs/testing";

import { HostingRepository } from "../repository/hosting.repository";
import { HostingService } from "../service/hosting.service";
import { HostingProvisionRunner } from "../service/hosting-provision.runner";
import { PanelSessionService } from "../service/panel-session.service";
import { PleskPanelService } from "../service/plesk-panel.service";

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
      ],
    }).compile();

    service = module.get<HostingService>(HostingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
