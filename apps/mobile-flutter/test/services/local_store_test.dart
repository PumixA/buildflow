import 'package:buildflow_mobile/models/local_report.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('LocalReport model has GPS and photo fields', () {
    final report = LocalReport(
      localId: 'id-1', title: 'Test', description: 'Desc',
      severity: 'MAJOR', photoPath: '/p.jpg',
      latitude: 48.85, longitude: 2.35,
      status: 'PENDING', version: 1, createdAt: '2026-01-01T00:00:00Z'
    );
    final map = report.toDbMap();
    expect(map['latitude'], 48.85);
    expect(map['photo_path'], '/p.jpg');
    expect(map['status'], 'PENDING');
  });
}
