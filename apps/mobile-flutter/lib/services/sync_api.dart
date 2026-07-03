import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'local_store.dart';

class SyncApi {
  static final GlobalKey<ScaffoldMessengerState> scaffoldKey =
      GlobalKey<ScaffoldMessengerState>();

  static const String _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000'
  );

  final LocalStore store;
  SyncApi(this.store);

  Future<int> pushReport(Map<String, Object?> report) async {
    final payload = {
      'localId': report['local_id'],
      'version': report['version'],
      'payload': {
        'title': report['title'],
        'description': report['description'],
        'severity': report['severity'],
        'latitude': report['latitude'],
        'longitude': report['longitude'],
        'photoPath': report['photo_path']
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

  Future<int> syncAll() async {
    final reports = await store.listReports();
    int synced = 0;
    for (final report in reports) {
      final status = report['status'] as String? ?? 'PENDING';
      if (status == 'SYNCED') continue;

      try {
        final httpCode = await pushReport(report);
        final localId = report['local_id'] as String;
        final version = report['version'] as int? ?? 1;
        if (httpCode == 200 || httpCode == 201) {
          await store.updateStatus(localId, 'SYNCED', version + 1);
          synced++;
        } else if (httpCode == 409) {
          await store.updateStatus(localId, 'CONFLICT', version + 1);
        }
      } catch (_) {
        // Skip failed items, will retry next sync
      }
    }

    if (synced > 0) {
      scaffoldKey.currentState?.showSnackBar(
        SnackBar(
          content: Text('Sync OK — $synced rapport(s) synchronisé(s)'),
          backgroundColor: const Color(0xFF1AA05D),
          duration: const Duration(seconds: 3)
        )
      );
    }

    return synced;
  }
}
