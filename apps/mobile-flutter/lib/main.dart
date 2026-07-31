import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/ncr_create_screen.dart';
import 'screens/sync_screen.dart';
import 'services/auth_service.dart';
import 'services/local_store.dart';
import 'services/sync_api.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Une session déjà ouverte évite de redemander les identifiants à chaque
  // lancement — le terrain n'a pas toujours du réseau pour se reconnecter.
  final hasSession = await AuthService.instance.restore();
  runApp(BuildFlowMobileApp(hasSession: hasSession));
}

class BuildFlowMobileApp extends StatefulWidget {
  final bool hasSession;
  const BuildFlowMobileApp({super.key, this.hasSession = false});

  @override
  State<BuildFlowMobileApp> createState() => _BuildFlowMobileAppState();
}

class _BuildFlowMobileAppState extends State<BuildFlowMobileApp> {
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _wasOffline = false;

  @override
  void initState() {
    super.initState();
    _listenConnectivity();
  }

  void _listenConnectivity() {
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) async {
      final hasConnection = results.any((r) => r != ConnectivityResult.none);
      if (hasConnection && _wasOffline) {
        _wasOffline = false;
        final store = LocalStore.instance;
        final reports = await store.listReports();
        final pending = reports.where((r) => r['status'] == 'PENDING').length;
        if (pending > 0) {
          await SyncApi(store).syncAll();
        }
      }
      if (!hasConnection) {
        _wasOffline = true;
      }
    });
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BuildFlow Mobile',
      scaffoldMessengerKey: SyncApi.scaffoldKey,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF050D18),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1F7DFF),
          brightness: Brightness.dark,
          primary: const Color(0xFF1F7DFF),
          secondary: const Color(0xFF1AA05D)
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF071223),
          foregroundColor: Colors.white
        )
      ),
      initialRoute: widget.hasSession ? '/create' : '/login',
      routes: {
        '/login': (context) => const LoginScreen(),
        '/create': (context) => const NcrCreateScreen(),
        '/sync': (context) => const SyncScreen()
      }
    );
  }
}
