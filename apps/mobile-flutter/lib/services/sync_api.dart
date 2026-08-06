import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'auth_service.dart';
import 'local_store.dart';

class SyncApi {
  static final GlobalKey<ScaffoldMessengerState> scaffoldKey =
      GlobalKey<ScaffoldMessengerState>();

  // 10.0.2.2 est l'alias de la machine hôte depuis l'émulateur Android ;
  // `localhost` y désigne l'émulateur lui-même, où rien n'écoute.
  static const String _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000'
  );

  final LocalStore store;
  SyncApi(this.store);

  /// Identifiant serveur renvoyé par la dernière synchronisation réussie.
  String? _dernierServerId;

  /// Envoie la photo du constat vers l'API, qui la scelle en WORM.
  ///
  /// Jusqu'ici seul `photoPath` transitait : un chemin local au téléphone, qui
  /// ne veut rien dire ailleurs et devient invalide dès qu'Android vide son
  /// cache. L'image ne quittait donc jamais l'appareil.
  ///
  /// L'échec n'interrompt pas la synchronisation : le constat lui-même est déjà
  /// remonté, et une photo manquante vaut mieux qu'un rapport bloqué.
  Future<bool> _pushPhoto(String serverId, Map<String, Object?> report) async {
    final chemin = report['photo_path'] as String?;
    if (chemin == null || chemin.isEmpty) return false;

    final fichier = File(chemin);
    if (!await fichier.exists()) return false;

    try {
      final octets = await fichier.readAsBytes();
      final auth = await AuthService.instance.authHeaders();
      final reponse = await http.post(
        Uri.parse('$_apiBaseUrl/ncr/$serverId/photo'),
        headers: {'Content-Type': 'application/json', ...auth},
        body: jsonEncode({
<<<<<<< HEAD
          'actorId': AuthService.instance.email ?? 'mobile',
=======
          'actorId': 'USR-CHEF',
>>>>>>> origin/main
          'fileName': chemin.split('/').last,
          'contentType': 'image/jpeg',
          'payloadBase64': base64Encode(octets),
          'latitude': report['latitude'],
          'longitude': report['longitude']
        })
      );
      return reponse.statusCode >= 200 && reponse.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

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

    // `x-role` n'est accepté par l'API qu'en mode développement : en production
    // toute synchronisation repartait en 401. On envoie le token de session.
    final auth = await AuthService.instance.authHeaders();
    final response = await http.post(
      Uri.parse('$_apiBaseUrl/sync/push'),
      headers: {
        'Content-Type': 'application/json',
        ...auth
      },
      body: jsonEncode(payload)
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final parsed = jsonDecode(response.body) as Map<String, dynamic>;
      // `serverId` est l'identifiant de la NCR créée côté serveur : sans lui, la
      // photo n'a rien à quoi se rattacher.
      _dernierServerId = parsed['serverId'] as String?;
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
          final serverId = _dernierServerId;
          if (serverId != null) {
            await _pushPhoto(serverId, report);
          }
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
