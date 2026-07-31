import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// Exception métier remontée à l'écran de connexion.
class AuthException implements Exception {
  final String message;
  final bool mfaRequired;
  AuthException(this.message, {this.mfaRequired = false});

  @override
  String toString() => message;
}

/// Session utilisateur du terrain.
///
/// L'application n'envoyait auparavant qu'un en-tête `x-role`, que l'API
/// n'accepte qu'en mode développement : en production toute synchronisation
/// repartait en 401. Le token est désormais obtenu par `POST /auth/session`
/// et conservé dans le Keystore Android via flutter_secure_storage — et non
/// dans SharedPreferences, lisible sur un appareil rooté.
class AuthService {
  static final AuthService instance = AuthService._();
  AuthService._();

  static const String _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000'
  );

  static const _tokenKey = 'buildflow_token';
  static const _roleKey = 'buildflow_role';
  static const _emailKey = 'buildflow_email';

  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true)
  );

  String? _cachedToken;
  String? _role;
  String? _email;

  String? get role => _role;
  String? get email => _email;

  /// Recharge la session persistée. À appeler au démarrage.
  Future<bool> restore() async {
    _cachedToken = await _storage.read(key: _tokenKey);
    _role = await _storage.read(key: _roleKey);
    _email = await _storage.read(key: _emailKey);
    return _cachedToken != null;
  }

  Future<String?> token() async {
    _cachedToken ??= await _storage.read(key: _tokenKey);
    return _cachedToken;
  }

  /// En-têtes d'authentification pour les appels API.
  /// Retourne une map vide sans session : mieux vaut un 401 explicite qu'un
  /// en-tête d'élévation de privilège accepté seulement en développement.
  Future<Map<String, String>> authHeaders() async {
    final value = await token();
    return value == null ? {} : {'Authorization': 'Bearer $value'};
  }

  Future<void> login(String email, String password, {String? mfaCode}) async {
    final body = <String, String>{'email': email, 'password': password};
    if (mfaCode != null && mfaCode.isNotEmpty) body['mfaCode'] = mfaCode;

    final http.Response response;
    try {
      response = await http
          .post(
            Uri.parse('$_apiBaseUrl/auth/session'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body)
          )
          .timeout(const Duration(seconds: 15));
    } catch (err) {
      throw AuthException('Serveur injoignable ($_apiBaseUrl).');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final parsed = jsonDecode(response.body) as Map<String, dynamic>;
      final accessToken = parsed['accessToken'] as String?;
      if (accessToken == null) {
        throw AuthException('Réponse du serveur inattendue.');
      }
      _cachedToken = accessToken;
      _role = parsed['role'] as String?;
      _email = email;
      await _storage.write(key: _tokenKey, value: accessToken);
      await _storage.write(key: _roleKey, value: _role ?? '');
      await _storage.write(key: _emailKey, value: email);
      return;
    }

    String message = 'Identifiants invalides.';
    try {
      final parsed = jsonDecode(response.body) as Map<String, dynamic>;
      message = (parsed['message'] ?? message).toString();
    } catch (_) {
      // Corps non JSON : on garde le message par défaut.
    }
    throw AuthException(message, mfaRequired: message.contains('MFA'));
  }

  Future<void> logout() async {
    _cachedToken = null;
    _role = null;
    _email = null;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _roleKey);
    await _storage.delete(key: _emailKey);
  }
}
