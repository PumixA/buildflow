export class NCRService {
  createNCR(data: { title: string; photos: string[] }) {
    if (!data.photos || data.photos.length === 0) {
      throw new Error('Photo obligatoire');
    }
    return { sync_status: false };
  }
}