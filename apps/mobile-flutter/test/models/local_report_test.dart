import 'package:buildflow_mobile/models/local_report.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('LocalReport toDbMap and fromDbMap roundtrip', () {
    const report = LocalReport(
      localId: 'test-123', title: 'Test NCR', description: 'Description',
      severity: 'MAJOR', photoPath: '/tmp/p.jpg',
      latitude: 48.85, longitude: 2.35,
      status: 'PENDING', version: 1, createdAt: '2026-07-03T12:00:00Z'
    );
    final map = report.toDbMap();
    expect(map['local_id'], 'test-123');
    expect(map['photo_path'], '/tmp/p.jpg');
    expect(map['latitude'], 48.85);
    final restored = LocalReport.fromDbMap(map);
    expect(restored.localId, report.localId);
    expect(restored.photoPath, report.photoPath);
  });
}
