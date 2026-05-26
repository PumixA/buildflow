import 'package:buildflow_mobile/models/local_report.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('LocalReport map roundtrip', () {
    const source = LocalReport(
      localId: 'local-1',
      title: 'Titre',
      description: 'Description',
      severity: 'MAJOR',
      photos: 2,
      status: 'PENDING',
      version: 1,
      createdAt: '2026-03-31T10:00:00.000Z'
    );

    final dbMap = source.toDbMap();
    final restored = LocalReport.fromDbMap(dbMap);

    expect(restored.localId, source.localId);
    expect(restored.title, source.title);
    expect(restored.description, source.description);
    expect(restored.severity, source.severity);
    expect(restored.photos, source.photos);
    expect(restored.status, source.status);
    expect(restored.version, source.version);
    expect(restored.createdAt, source.createdAt);
  });
}
