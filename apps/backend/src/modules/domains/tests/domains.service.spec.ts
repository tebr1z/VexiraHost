import { Test, TestingModule } from "@nestjs/testing";

import { MockRegistrarProvider } from "../providers/mock-registrar.provider";
import { DomainsRepository } from "../repository/domains.repository";
import { DomainEmailService } from "../service/domain-email.service";
import { DomainsService } from "../service/domains.service";

import { SiteAccessService } from "@/modules/auth/service/site-access.service";
import { StaffAlertService } from "@/shared/staff-alerts/staff-alert.service";

describe("DomainsService", () => {
  let service: DomainsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainsService,
        { provide: DomainsRepository, useValue: {} },
        { provide: MockRegistrarProvider, useValue: {} },
        { provide: DomainEmailService, useValue: {} },
        { provide: StaffAlertService, useValue: { notify: jest.fn() } },
        { provide: SiteAccessService, useValue: { assertSectionOpen: jest.fn() } },
      ],
    }).compile();

    service = module.get<DomainsService>(DomainsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
