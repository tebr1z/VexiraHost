import { Test, TestingModule } from "@nestjs/testing";

import { UsersService } from "../service/users.service";

import { AuthRepository } from "@/modules/auth/repository/auth.repository";
import { AuthEmailService } from "@/modules/auth/service/auth-email.service";
import { WhatsappService } from "@/modules/whatsapp/service/whatsapp.service";

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: AuthRepository, useValue: {} },
        { provide: AuthEmailService, useValue: {} },
        { provide: WhatsappService, useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
