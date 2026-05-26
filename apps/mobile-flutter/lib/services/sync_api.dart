import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/local_report.dart';
import 'local_store.dart';

class SyncApi {
  static const String _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000'
  );

  Future<int> pushReport(LocalReport report) async {
    final payload = {
      'localId': report.localId,
      'version': report.version,
      'payload': {
        'title': report.title,
        'description': report.description,
        'severity': report.severity,
        'photos': report.photos
      }
    };

    final response = await http.post(
      Uri.parse('$_apiBaseUrl/sync/push'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload)
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final parsed = jsonDecode(response.body) as Map<String, dynamic>;
      return parsed['httpCode'] as int? ?? 200;
    }
    throw Exception('Sync HTTP failure: ${response.statusCode}');
  }

  Future<void> syncAll() async {
    final reports = await LocalStore.instance.listReports();
    for (final report in reports) {
      if (report.status == 'SYNCED') {
        continue;
      }

      final httpCode = await pushReport(report);
      if (httpCode == 200 || httpCode == 201) {
        await LocalStore.instance.updateStatus(report.localId, 'SYNCED', report.version + 1);
      } else if (httpCode == 409) {
        await LocalStore.instance.updateStatus(report.localId, 'CONFLICT', report.version + 1);
      }
    }
  }
}
