import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/ncr_create_screen.dart';
import 'screens/sync_screen.dart';
import 'services/auth_service.dart';
import 'services/local_store.dart';
import 'services/sync_api.dart';

/* ------------------------------------------------------------------ */
/*  BuildFlow Design Tokens                                           */
/* ------------------------------------------------------------------ */
class AppColors {
  static const bg = Color(0xFF050C15);
  static const panel = Color(0xFF0B1525);
  static const card = Color(0xFF0A1526);
  static const input = Color(0xFF0D1B30);
  static const line = Color(0xFF1E3555);
  static const lineFocus = Color(0xFF2A446C);
  static const text = Color(0xFFE8F0FB);
  static const textSoft = Color(0xFF95A7C2);
  static const textMuted = Color(0xFF5E7DA8);
  static const primary = Color(0xFF1F7DFF);
  static const ok = Color(0xFF18A45D);
  static const warn = Color(0xFFF59F24);
  static const critical = Color(0xFFFF4D4F);
  static const purple = Color(0xFFA855F7);
  static const buttonBg = Color(0xFF133969);
}

final _appTheme = ThemeData(
  useMaterial3: true,
  brightness: Brightness.dark,
  scaffoldBackgroundColor: AppColors.bg,
  fontFamily: GoogleFonts.manrope().fontFamily,
  colorScheme: const ColorScheme.dark(
    primary: AppColors.primary,
    onPrimary: Colors.white,
    surface: AppColors.panel,
    onSurface: AppColors.text,
    error: AppColors.critical,
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.input,
    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.lineFocus),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.lineFocus),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.primary),
    ),
    labelStyle: const TextStyle(color: AppColors.textSoft, fontSize: 13),
    hintStyle: const TextStyle(color: AppColors.textMuted),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: AppColors.buttonBg,
      foregroundColor: AppColors.text,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: AppColors.lineFocus),
      ),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
    ),
  ),
  cardTheme: CardThemeData(
    color: AppColors.card,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
      side: const BorderSide(color: AppColors.line),
    ),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: Color(0xFF070F1B),
    selectedItemColor: AppColors.primary,
    unselectedItemColor: AppColors.textMuted,
    type: BottomNavigationBarType.fixed,
    elevation: 0,
  ),
  snackBarTheme: SnackBarThemeData(
    backgroundColor: AppColors.card,
    contentTextStyle: const TextStyle(color: AppColors.text),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    behavior: SnackBarBehavior.floating,
  ),
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final hasSession = await AuthService.instance.restore();
  runApp(BuildFlowMobileApp(initialSession: hasSession));
}

class BuildFlowMobileApp extends StatefulWidget {
  final bool initialSession;
  const BuildFlowMobileApp({super.key, this.initialSession = false});

  @override
  State<BuildFlowMobileApp> createState() => _BuildFlowMobileAppState();
}

class _BuildFlowMobileAppState extends State<BuildFlowMobileApp> {
  late bool _hasSession;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _wasOffline = false;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _hasSession = widget.initialSession;
    if (_hasSession) _listenConnectivity();
  }

  void _listenConnectivity() {
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) async {
      final hasConnection = results.any((r) => r != ConnectivityResult.none);
      if (hasConnection && _wasOffline) {
        _wasOffline = false;
        final store = LocalStore.instance;
        final reports = await store.listReports();
        final pending = reports.where((r) => r['status'] == 'PENDING').length;
        if (pending > 0) await SyncApi(store).syncAll();
      }
      if (!hasConnection) _wasOffline = true;
    });
  }

  void _onLoginSuccess() {
    setState(() => _hasSession = true);
    _listenConnectivity();
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BuildFlow',
      scaffoldMessengerKey: SyncApi.scaffoldKey,
      theme: _appTheme,
      home: _hasSession ? _buildShell() : LoginScreen(onLoginSuccess: _onLoginSuccess),
    );
  }

  Widget _buildShell() {
    final screens = <Widget>[
      HomeScreen(
        onNavigate: (index) => setState(() => _currentIndex = index),
        onLogout: () {
          _connectivitySub?.cancel();
          setState(() => _hasSession = false);
        },
      ),
      const NcrCreateScreen(),
      const SyncScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: screens),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Accueil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.add_circle_outline),
            activeIcon: Icon(Icons.add_circle),
            label: 'Nouveau',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.sync_outlined),
            activeIcon: Icon(Icons.sync),
            label: 'Sync',
          ),
        ],
      ),
    );
  }
}
