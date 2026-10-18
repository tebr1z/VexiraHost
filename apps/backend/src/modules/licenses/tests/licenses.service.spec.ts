import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { MockAddonProvider } from "../providers/mock-addon.provider";
import { LicensesRepository } from "../repository/licenses.repository";
import { AddonEmailService } from "../service/addon-email.service";
import { LicensesService } from "../service/licenses.service";

describe("LicensesService", () => {
  let service: LicensesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensesService,
        { provide: LicensesRepository, useValue: {} },
        { provide: MockAddonProvider, useValue: {} },
        { provide: AddonEmailService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    service = module.get<LicensesService>(LicensesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
