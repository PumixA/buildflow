import 'package:flutter/material.dart';
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
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: FutureBuilder<List<Map<String, Object?>>>(
            future: _reportsFuture,
            builder: (context, snapshot) {
              final reports = snapshot.data ?? [];
              final pendingCount = reports.where((r) => r['status'] != 'SYNCED').length;

              return Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1AA05D),
                      borderRadius: BorderRadius.circular(8)
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('OFFLINE-FIRST', style: TextStyle(fontWeight: FontWeight.bold)),
                        Text('$pendingCount en attente')
                      ]
                    )
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _reload,
                      child: ListView.separated(
                        itemCount: reports.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final item = reports[index];
                          final status = item['status'] as String? ?? 'PENDING';
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
                                          Text('${item['title']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                          Text(item['severity'] as String? ?? '', style: const TextStyle(color: Color(0xFF8EA5C5))),
                                          Text(
                                            '${(item['created_at'] as String? ?? '').substring(0, 16)}',
                                            style: const TextStyle(color: Color(0xFF8EA5C5), fontSize: 12)
                                          )
                                        ]
                                      )
                                    ),
                                    _buildStatusIcon(status)
                                  ]
                                ),
                                const SizedBox(height: 8),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(20),
                                  child: LinearProgressIndicator(
                                    value: status == 'SYNCED' ? 1 : (status == 'CONFLICT' ? 0.5 : 0.15),
                                    minHeight: 5,
                                    backgroundColor: const Color(0xFF1A2D45),
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      status == 'SYNCED' ? const Color(0xFF1AA05D) : const Color(0xFF1F7DFF)
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
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
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
}
