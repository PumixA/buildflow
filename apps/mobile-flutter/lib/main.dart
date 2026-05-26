import 'package:flutter/material.dart';
import 'screens/ncr_create_screen.dart';
import 'screens/sync_screen.dart';

void main() {
  runApp(const BuildFlowMobileApp());
}

class BuildFlowMobileApp extends StatelessWidget {
  const BuildFlowMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BuildFlow Mobile',
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
      initialRoute: '/create',
      routes: {
        '/create': (context) => const NcrCreateScreen(),
        '/sync': (context) => const SyncScreen()
      }
    );
  }
}
