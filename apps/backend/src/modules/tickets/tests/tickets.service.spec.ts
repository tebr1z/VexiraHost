import { Test, TestingModule } from "@nestjs/testing";

import { TicketsRepository } from "../repository/tickets.repository";
import { TicketEmailService } from "../service/ticket-email.service";
import { TicketsService } from "../service/tickets.service";

import { SiteAccessService } from "@/modules/auth/service/site-access.service";
import { TurnstileService } from "@/modules/auth/service/turnstile.service";
import { StaffAlertService } from "@/shared/staff-alerts/staff-alert.service";
import { STORAGE_PROVIDER } from "@/shared/storage/storage.interface";

describe("TicketsService", () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: TicketsRepository, useValue: {} },
        {
          provide: TicketEmailService,
          useValue: {
            sendTicketCreatedEmail: jest.fn(),
            sendTicketReplyEmail: jest.fn(),
            sendTicketStatusChangedEmail: jest.fn(),
          },
        },
        { provide: STORAGE_PROVIDER, useValue: { upload: jest.fn(), download: jest.fn() } },
        { provide: StaffAlertService, useValue: { notify: jest.fn() } },
        { provide: TurnstileService, useValue: { assertValid: jest.fn() } },
        { provide: SiteAccessService, useValue: { assertSectionOpen: jest.fn() } },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
