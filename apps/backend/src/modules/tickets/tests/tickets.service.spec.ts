import { Test, TestingModule } from "@nestjs/testing";

import { STORAGE_PROVIDER } from "@/shared/storage/storage.interface";

import { TicketsService } from "../service/tickets.service";
import { TicketsRepository } from "../repository/tickets.repository";
import { TicketEmailService } from "../service/ticket-email.service";

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
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
