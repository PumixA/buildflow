import 'package:flutter/material.dart';
import '../main.dart';
import '../services/auth_service.dart';
import '../services/local_store.dart';
import '../services/roles.dart';

class HomeScreen extends StatefulWidget {
  final void Function(int index)? onNavigate;
  final VoidCallback? onLogout;
  const HomeScreen({super.key, this.onNavigate, this.onLogout});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _pendingCount = 0;
  int _syncedCount = 0;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    final reports = await LocalStore.instance.listReports();
    if (mounted) {
      setState(() {
        _pendingCount = reports.where((r) => r['status'] == 'PENDING').length;
        _syncedCount = reports.where((r) => r['status'] == 'SYNCED').length;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = AuthService.instance.email ?? 'Chef de chantier';
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.person, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('BuildFlow', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
                    Text(name, style: const TextStyle(fontSize: 12, color: AppColors.textSoft)),
                  ],
                ),
              ),
              TextButton(
                onPressed: () async {
                  await AuthService.instance.logout();
                  widget.onLogout?.call();
                },
                child: const Text('Déconnexion', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // KPI cards
          Row(
            children: [
              _KpiCard(icon: Icons.pending_actions, value: '$_pendingCount', label: 'En attente', color: AppColors.warn),
              const SizedBox(width: 10),
              _KpiCard(icon: Icons.check_circle_outline, value: '$_syncedCount', label: 'Synchronisés', color: AppColors.ok),
              const SizedBox(width: 10),
              const _KpiCard(icon: Icons.offline_bolt, value: 'OFF', label: 'Hors-ligne', color: AppColors.primary),
            ],
          ),
          const SizedBox(height: 20),

          // Quick access
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.panel,
              border: Border.all(color: AppColors.line),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Accès rapides', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (peutCreerNcr(AuthService.instance.role))
                      Expanded(
                        child: _QuickLink(
                          icon: Icons.add_circle_outline,
                          label: 'Déclarer\nune NCR',
                          onTap: () => widget.onNavigate?.call(1),
                        ),
                      ),
                    if (peutCreerNcr(AuthService.instance.role))
                      const SizedBox(width: 8),
                    Expanded(
                      child: _QuickLink(
                        icon: Icons.sync,
                        label: 'Synchroniser',
                        onTap: () => widget.onNavigate?.call(2),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Status text
          Text(
            _pendingCount > 0
                ? '$_pendingCount rapport${_pendingCount > 1 ? 's' : ''} en attente de synchronisation'
                : 'Tous les rapports sont synchronisés',
            style: const TextStyle(color: AppColors.textSoft, fontSize: 13),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;
  const _KpiCard({required this.icon, required this.value, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.card,
          border: Border.all(color: AppColors.line),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
            Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _QuickLink extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _QuickLink({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.input,
          border: Border.all(color: AppColors.lineFocus),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Icon(icon, color: const Color(0xFF8FC0FF), size: 24),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF8FC0FF)), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
