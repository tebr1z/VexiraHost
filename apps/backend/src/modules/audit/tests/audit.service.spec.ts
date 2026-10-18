import { Test, TestingModule } from "@nestjs/testing";

import { AuditRepository } from "../repository/audit.repository";
import { AuditService } from "../service/audit.service";

describe("AuditService", () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: AuditRepository, useValue: {} }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
