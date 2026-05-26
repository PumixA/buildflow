import 'package:flutter/material.dart';
import '../models/local_report.dart';
import '../services/local_store.dart';
import '../services/sync_api.dart';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  final _syncApi = SyncApi();
  late Future<List<LocalReport>> _reportsFuture;

  @override
  void initState() {
    super.initState();
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
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Synchronisation terminée'))
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: FutureBuilder<List<LocalReport>>(
            future: _reportsFuture,
            builder: (context, snapshot) {
              final reports = snapshot.data ?? [];
              final pendingCount = reports.where((item) => item.status != 'SYNCED').length;

              return Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1AA05D),
                      borderRadius: BorderRadius.circular(8)
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'CONNECTÉ AU CLOUD',
                          style: TextStyle(fontWeight: FontWeight.bold)
                        ),
                        Text('(Simulé)')
                      ]
                    )
                  ),
                  const SizedBox(height: 12),
                  Card(
                    color: const Color(0xFF091426),
                    child: ListTile(
                      leading: const Icon(Icons.sync),
                      title: const Text('Synchronisation'),
                      subtitle: Text('$pendingCount rapports en attente')
                    )
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _reload,
                      child: ListView.separated(
                        itemCount: reports.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final item = reports[index];
                          return Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF091426),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFF1F3554))
                            ),
                            padding: const EdgeInsets.all(10),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.description_outlined),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(item.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                                          Text(item.severity, style: const TextStyle(color: Color(0xFF8EA5C5))),
                                          Text(
                                            '${item.createdAt.substring(0, 16)}  •  ${item.photos} photo(s)',
                                            style: const TextStyle(color: Color(0xFF8EA5C5), fontSize: 12)
                                          )
                                        ]
                                      )
                                    ),
                                    _buildStatusIcon(item.status)
                                  ]
                                ),
                                const SizedBox(height: 8),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(20),
                                  child: LinearProgressIndicator(
                                    value: _progressForStatus(item.status),
                                    minHeight: 5,
                                    backgroundColor: const Color(0xFF1A2D45),
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      item.status == 'SYNCED' ? const Color(0xFF1AA05D) : const Color(0xFF1F7DFF)
                                    )
                                  )
                                )
                              ]
                            )
                          );
                        }
                      )
                    )
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Dernière synchronisation: statut local',
                    style: TextStyle(color: Color(0xFF8EA5C5), fontSize: 12)
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
                      minimumSize: const Size.fromHeight(50)
                    ),
                    onPressed: _syncAll,
                    icon: const Icon(Icons.sync),
                    label: const Text('SYNCHRONISER TOUT')
                  )
                ]
              );
            }
          )
        )
      )
    );
  }

  Widget _buildStatusIcon(String status) {
    switch (status) {
      case 'SYNCED':
        return const Icon(Icons.check_circle, color: Color(0xFF1AA05D));
      case 'CONFLICT':
        return const Icon(Icons.warning_amber, color: Color(0xFFFF4D4F));
      default:
        return const Icon(Icons.schedule, color: Color(0xFFF59F24));
    }
  }

  double _progressForStatus(String status) {
    switch (status) {
      case 'SYNCED':
        return 1;
      case 'CONFLICT':
        return 0.5;
      default:
        return 0.15;
    }
  }
}
