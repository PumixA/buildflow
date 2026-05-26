import 'package:buildflow_mobile/models/local_report.dart';
import 'package:buildflow_mobile/services/local_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('LocalStore save/list/update workflow', () async {
    final localId = 'test-${DateTime.now().microsecondsSinceEpoch}';
    final report = LocalReport(
      localId: localId,
      title: 'Recette locale',
      description: 'Persist and update status',
      severity: 'MINOR',
      photos: 1,
      status: 'PENDING',
      version: 1,
      createdAt: DateTime.now().toUtc().toIso8601String()
    );

    await LocalStore.instance.savePendingReport(report);
    final listed = await LocalStore.instance.listReports();
    final created = listed.where((item) => item.localId == localId).toList();

    expect(created.length, 1);
    expect(created.first.status, 'PENDING');

    await LocalStore.instance.updateStatus(localId, 'SYNCED', 2);
    final updatedList = await LocalStore.instance.listReports();
    final updated = updatedList.firstWhere((item) => item.localId == localId);

    expect(updated.status, 'SYNCED');
    expect(updated.version, 2);
  });
}
