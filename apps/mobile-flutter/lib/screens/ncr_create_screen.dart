import 'package:flutter/material.dart';
import '../models/local_report.dart';
import '../services/local_store.dart';

class NcrCreateScreen extends StatefulWidget {
  const NcrCreateScreen({super.key});

  @override
  State<NcrCreateScreen> createState() => _NcrCreateScreenState();
}

class _NcrCreateScreenState extends State<NcrCreateScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _severity = 'MAJOR';
  bool _offlineMode = true;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(14),
          children: [
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: _offlineMode ? const Color(0xFFFF9800) : const Color(0xFF1AA05D)
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _offlineMode ? 'MODE HORS-LIGNE' : 'CONNECTÉ AU CLOUD',
                    style: const TextStyle(fontWeight: FontWeight.bold)
                  ),
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, '/sync'),
                    child: const Text(
                      'Sync',
                      style: TextStyle(color: Colors.white)
                    )
                  )
                ]
              )
            ),
            const SizedBox(height: 12),
            const Card(
              color: Color(0xFF091426),
              child: ListTile(
                leading: Icon(Icons.note_alt_outlined, color: Color(0xFF3E9BFF)),
                title: Text('Nouvelle NCR'),
                subtitle: Text('Paris La Défense T4')
              )
            ),
            const SizedBox(height: 8),
            Card(
              color: const Color(0xFF091426),
              child: ListTile(
                leading: const Icon(Icons.location_on, color: Color(0xFF3E9BFF)),
                title: const Text('Position GPS'),
                subtitle: const Text('48.8924°N, 2.2360°E'),
                trailing: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A8B4D),
                    borderRadius: BorderRadius.circular(6)
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  child: const Text('Précis')
                )
              )
            ),
            const SizedBox(height: 12),
            InkWell(
              onTap: () {},
              child: Container(
                height: 180,
                decoration: BoxDecoration(
                  color: const Color(0xFF1F67BF),
                  borderRadius: BorderRadius.circular(12)
                ),
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.photo_camera, size: 48),
                    SizedBox(height: 10),
                    Text(
                      'AJOUTER UNE PHOTO',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)
                    ),
                    SizedBox(height: 4),
                    Text('0/4 photos')
                  ]
                )
              )
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Titre du signalement',
                hintText: 'Ex: défaut de sécurité échafaudage...',
                border: OutlineInputBorder()
              )
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _severity,
              decoration: const InputDecoration(
                labelText: 'Gravité',
                border: OutlineInputBorder()
              ),
              items: const [
                DropdownMenuItem(value: 'MINOR', child: Text('Mineure')),
                DropdownMenuItem(value: 'MAJOR', child: Text('Majeure')),
                DropdownMenuItem(value: 'CRITICAL', child: Text('Critique'))
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _severity = value);
                }
              }
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description',
                border: OutlineInputBorder()
              )
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF1A8B4D),
                padding: const EdgeInsets.symmetric(vertical: 14)
              ),
              onPressed: () async {
                if (_titleController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Le titre est obligatoire'))
                  );
                  return;
                }

                final report = LocalReport(
                  localId: 'local-${DateTime.now().millisecondsSinceEpoch}',
                  title: _titleController.text.trim(),
                  description: _descriptionController.text.trim(),
                  severity: _severity,
                  photos: 1,
                  status: 'PENDING',
                  version: 1,
                  createdAt: DateTime.now().toIso8601String()
                );

                await LocalStore.instance.savePendingReport(report);
                if (!context.mounted) {
                  return;
                }
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('NCR enregistrée en local'))
                );
              },
              icon: const Icon(Icons.save),
              label: const Text('ENREGISTRER EN LOCAL')
            ),
            const SizedBox(height: 8),
            const Text(
              'Sera synchronisée automatiquement',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF8EA5C5))
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              title: const Text('Mode Offline'),
              value: _offlineMode,
              onChanged: (value) {
                setState(() => _offlineMode = value);
              }
            )
          ]
        )
      )
    );
  }
}
