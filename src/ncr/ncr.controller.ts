import { NcrStatus } from '../../libs/domain/src/models';
import { CreateNcrInput, ManagedNcr, NcrService } from './ncr.service';

export class NcrController {
  constructor(private readonly service: NcrService) {}

  create(input: CreateNcrInput): ManagedNcr {
    return this.service.createNCR(input);
  }

  list(projectId?: string, status?: NcrStatus): ManagedNcr[] {
    return this.service.list(projectId, status);
  }

  detail(ncrId: string): ManagedNcr {
    return this.service.getById(ncrId);
  }
}
