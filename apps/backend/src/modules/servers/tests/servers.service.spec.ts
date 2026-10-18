import { Test, TestingModule } from "@nestjs/testing";

import { ServersRepository } from "../repository/servers.repository";
import { ProxmoxGatewayService } from "../service/proxmox-gateway.service";
import { ServersService } from "../service/servers.service";

describe("ServersService", () => {
  let service: ServersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServersService,
        { provide: ServersRepository, useValue: {} },
        { provide: ProxmoxGatewayService, useValue: {} },
      ],
    }).compile();

    service = module.get<ServersService>(ServersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
