import 'package:flutter/material.dart';
import '../main.dart';
import '../services/local_store.dart';
import '../services/sync_api.dart';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  late final SyncApi _syncApi;
  late Future<List<Map<String, Object?>>> _reportsFuture;

  @override
  void initState() {
    super.initState();
    _syncApi = SyncApi(LocalStore.instance);
    _reportsFuture = LocalStore.instance.listReports();
  }

  Future<void> _reload() async {
    setState(() {
      _reportsFuture = LocalStore.instance.listReports();
    });
  }

  Future<void> _syncAll() async {
    await _syncApi.syncAll();
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: FutureBuilder<List<Map<String, Object?>>>(
          future: _reportsFuture,
          builder: (context, snapshot) {
            final reports = snapshot.data ?? [];
            final pendingCount = reports.where((r) => r['status'] != 'SYNCED').length;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Toolbar
                Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Synchronisation', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                          Text('Rapports en attente d\'envoi', style: TextStyle(fontSize: 12, color: AppColors.textSoft)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: pendingCount > 0 ? AppColors.warn.withValues(alpha: 0.15) : AppColors.ok.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: pendingCount > 0 ? AppColors.warn.withValues(alpha: 0.3) : AppColors.ok.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        '$pendingCount en attente',
                        style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w700,
                          color: pendingCount > 0 ? AppColors.warn : AppColors.ok,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Reports list
                Expanded(
                  child: reports.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.inbox_outlined, size: 48, color: AppColors.textMuted.withValues(alpha: 0.5)),
                              const SizedBox(height: 12),
                              const Text('Aucun rapport local', style: TextStyle(color: AppColors.textSoft)),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _reload,
                          child: ListView.separated(
                            itemCount: reports.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final item = reports[index];
                              final status = item['status'] as String? ?? 'PENDING';
                              return _ReportCard(item: item, status: status);
                            },
                          ),
                        ),
                ),

                // Sync button
                if (pendingCount > 0) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 46,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.buttonBg,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: const BorderSide(color: AppColors.lineFocus),
                        ),
                      ),
                      onPressed: _syncAll,
                      icon: const Icon(Icons.sync, size: 18),
                      label: const Text('SYNCHRONISER TOUT', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final Map<String, Object?> item;
  final String status;
  const _ReportCard({required this.item, required this.status});

  Color get _statusColor {
    switch (status) {
      case 'SYNCED': return AppColors.ok;
      case 'CONFLICT': return AppColors.critical;
      default: return AppColors.warn;
    }
  }

  IconData get _statusIcon {
    switch (status) {
      case 'SYNCED': return Icons.check_circle;
      case 'CONFLICT': return Icons.warning_amber;
      default: return Icons.schedule;
    }
  }

  String get _statusLabel {
    switch (status) {
      case 'SYNCED': return 'Synchronisé';
      case 'CONFLICT': return 'Conflit';
      default: return 'En attente';
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = item['title'] as String? ?? '';
    final severity = item['severity'] as String? ?? '';
    final createdAt = item['created_at'] as String? ?? '';

    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        border: Border.all(color: AppColors.line),
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: _statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(_statusIcon, color: _statusColor, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        _SeverityChip(severity: severity),
                        const SizedBox(width: 8),
                        Text(createdAt.length >= 10 ? createdAt.substring(0, 10) : createdAt,
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Text(_statusLabel, style: TextStyle(color: _statusColor, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: LinearProgressIndicator(
              value: status == 'SYNCED' ? 1 : (status == 'CONFLICT' ? 0.5 : 0.15),
              minHeight: 4,
              backgroundColor: AppColors.line,
              valueColor: AlwaysStoppedAnimation<Color>(_statusColor),
            ),
          ),
        ],
      ),
    );
  }
}

class _SeverityChip extends StatelessWidget {
  final String severity;
  const _SeverityChip({required this.severity});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (severity) {
      case 'CRITICAL':
        color = AppColors.critical;
        label = 'Critique';
        break;
      case 'MAJOR':
        color = AppColors.warn;
        label = 'Majeure';
        break;
      default:
        color = AppColors.textMuted;
        label = 'Mineure';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
    );
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
