import { Test, TestingModule } from '@nestjs/testing';

import { ServersService } from '../service/servers.service';
import { ServersRepository } from '../repository/servers.repository';

describe('ServersService', () => {
  let service: ServersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServersService,
        { provide: ServersRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<ServersService>(ServersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
