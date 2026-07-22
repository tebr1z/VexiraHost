import { Test, TestingModule } from '@nestjs/testing';

import { LicensesService } from '../service/licenses.service';
import { LicensesRepository } from '../repository/licenses.repository';

describe('LicensesService', () => {
  let service: LicensesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensesService,
        { provide: LicensesRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<LicensesService>(LicensesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
