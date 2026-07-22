import { Test, TestingModule } from '@nestjs/testing';

import { DomainsService } from '../service/domains.service';
import { DomainsRepository } from '../repository/domains.repository';

describe('DomainsService', () => {
  let service: DomainsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainsService,
        { provide: DomainsRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<DomainsService>(DomainsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
