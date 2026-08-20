import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { AuthRepository } from "../repository/auth.repository";
import { AuthEmailService } from "../service/auth-email.service";
import { AuthService } from "../service/auth.service";
import { LoginAttemptService } from "../service/login-attempt.service";
import { SiteAccessService } from "../service/site-access.service";
import { TurnstileService } from "../service/turnstile.service";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: AuthEmailService, useValue: {} },
        { provide: LoginAttemptService, useValue: {} },
        { provide: TurnstileService, useValue: { assertValid: jest.fn() } },
        {
          provide: SiteAccessService,
          useValue: { assertRegisterOpen: jest.fn(), assertLoginOpen: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
