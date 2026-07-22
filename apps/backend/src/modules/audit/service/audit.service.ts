import { Injectable } from '@nestjs/common';

import { AuditRepository } from '../repository/audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}
}
