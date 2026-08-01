import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';
import '../models/local_report.dart';
import '../services/auth_service.dart';
import '../services/local_store.dart';

class NcrCreateScreen extends StatefulWidget {
  const NcrCreateScreen({super.key});

  @override
  State<NcrCreateScreen> createState() => _NcrCreateScreenState();
}

class _NcrCreateScreenState extends State<NcrCreateScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _projectId = '';
  List<Map<String, String>> _projects = [];
  bool _loadingProjects = true;
  String _severity = 'MAJOR';
  File? _photo;
  double _latitude = 0;
  double _longitude = 0;
  bool _locating = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _getLocation();
    _fetchProjects();
  }

  Future<void> _fetchProjects() async {
    try {
      final auth = await AuthService.instance.authHeaders();
      final res = await http.get(
        Uri.parse('${AuthService.instance.apiBaseUrl}/projects'),
        headers: {'Content-Type': 'application/json', ...auth}
      );
      if (res.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(res.body);
        final List<dynamic> data = (body['items'] as List<dynamic>?) ?? [body];
        if (mounted) {
          setState(() {
            _projects = data.map<Map<String, String>>((p) => {
              'id': p['id']?.toString() ?? '',
              'name': p['name']?.toString() ?? p['nom']?.toString() ?? ''
            }).where((p) => p['id']!.isNotEmpty).toList();
            if (_projects.isNotEmpty) {
              _projectId = _projects.first['id']!;
            }
            _loadingProjects = false;
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _loadingProjects = false);
    }
  }

  Future<void> _getLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      final position = await Geolocator.getCurrentPosition();
      if (mounted) {
        setState(() {
          _latitude = position.latitude;
          _longitude = position.longitude;
          _locating = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _locating = false);
      }
    }
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.camera, maxWidth: 1024);
    if (picked != null && mounted) {
      setState(() => _photo = File(picked.path));
    }
  }

  Future<void> _save() async {
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Le titre est obligatoire'))
      );
      return;
    }

    setState(() => _saving = true);

    try {
      final report = LocalReport(
        localId: const Uuid().v4(),
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        severity: _severity,
        photoPath: _photo?.path,
        latitude: _latitude,
        longitude: _longitude,
        status: 'PENDING',
        version: 1,
        createdAt: DateTime.now().toIso8601String()
      );

      await LocalStore.instance.savePendingReport(report);

      if (mounted) {
        setState(() {
          _saving = false;
          _photo = null;
        });
        _titleController.clear();
        _descriptionController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('NCR enregistrée en local — en attente de synchronisation'),
            backgroundColor: Color(0xFFFF9800)
          )
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: ${e.toString().substring(0, 100)}'),
            backgroundColor: Colors.red
          )
        );
      }
    }
  }

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
            // Status bar
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: const Color(0xFF1AA05D)
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('OFFLINE-FIRST', style: TextStyle(fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, '/sync'),
                    child: const Text('Sync', style: TextStyle(color: Colors.white))
                  )
                ]
              )
            ),
            const SizedBox(height: 12),

            // Project dropdown
            _loadingProjects
              ? const LinearProgressIndicator()
              : DropdownButtonFormField<String>(
                  initialValue: _projectId.isNotEmpty ? _projectId : null,
                  hint: const Text('Sélectionner un chantier'),
                  decoration: const InputDecoration(
                    labelText: 'Chantier',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.construction)
                  ),
                  items: _projects.map((p) => DropdownMenuItem(
                    value: p['id'],
                    child: Text(p['name'] ?? p['id'] ?? '')
                  )).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() => _projectId = val);
                    }
                  }
                ),
            const SizedBox(height: 12),

            // GPS card
            Card(
              color: const Color(0xFF091426),
              child: ListTile(
                leading: const Icon(Icons.location_on, color: Color(0xFF3E9BFF)),
                title: const Text('Position GPS'),
                subtitle: _locating
                    ? const Text('Acquisition...', style: TextStyle(color: Colors.orange))
                    : Text('${_latitude.toStringAsFixed(4)}°N, ${_longitude.toStringAsFixed(4)}°E'),
                trailing: _locating
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A8B4D),
                          borderRadius: BorderRadius.circular(6)
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        child: const Text('OK')
                      )
              )
            ),
            const SizedBox(height: 12),

            // Photo
            InkWell(
              onTap: _pickPhoto,
              child: Container(
                height: 180,
                decoration: BoxDecoration(
                  color: _photo != null ? Colors.transparent : const Color(0xFF1F67BF),
                  borderRadius: BorderRadius.circular(12),
                  image: _photo != null
                      ? DecorationImage(image: FileImage(_photo!), fit: BoxFit.cover)
                      : null
                ),
                child: _photo == null
                    ? const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.photo_camera, size: 48),
                          SizedBox(height: 10),
                          Text('AJOUTER UNE PHOTO', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                          SizedBox(height: 4),
                          Text('Obligatoire')
                        ]
                      )
                    : Align(
                        alignment: Alignment.topRight,
                        child: IconButton(
                          icon: const Icon(Icons.refresh, color: Colors.white, size: 30),
                          onPressed: _pickPhoto
                        )
                      )
              )
            ),
            const SizedBox(height: 12),

            // Title
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Titre du signalement',
                hintText: 'Ex: défaut de sécurité échafaudage...',
                border: OutlineInputBorder()
              )
            ),
            const SizedBox(height: 12),

            // Severity
            DropdownButtonFormField<String>(
              initialValue: _severity,
              decoration: const InputDecoration(labelText: 'Gravité', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'MINOR', child: Text('Mineure')),
                DropdownMenuItem(value: 'MAJOR', child: Text('Majeure')),
                DropdownMenuItem(value: 'CRITICAL', child: Text('Critique'))
              ],
              onChanged: (value) { if (value != null) setState(() => _severity = value); }
            ),
            const SizedBox(height: 12),

            // Description
            TextField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder())
            ),
            const SizedBox(height: 16),

            // Save button
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF1A8B4D),
                padding: const EdgeInsets.symmetric(vertical: 14)
              ),
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save),
              label: Text(_saving ? 'Enregistrement...' : 'ENREGISTRER EN LOCAL')
            ),
            const SizedBox(height: 8),
            const Text(
              'Synchronisation automatique au retour du réseau',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF8EA5C5))
            )
          ]
        )
      )
    );
  }
}
