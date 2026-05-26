import { NcrService } from './ncr/ncr.service';

export class NCRService extends NcrService {
  createNCR(data: { title: string; photos: string[] }) {
    return super.createNCR({
      title: data.title,
      description: '',
      projectId: 'PROJ-LEGACY',
      creatorId: 'SYSTEM-LEGACY',
      photos: data.photos,
      latitude: 45.764043,
      longitude: 4.835659,
      priority: 'MEDIUM'
    });
  }
}
