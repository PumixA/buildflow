import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';
import '../main.dart';
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
    // Charger d'abord le cache local pour un affichage immédiat
    final cached = await LocalStore.instance.cachedProjects();
    if (cached.isNotEmpty && mounted) {
      setState(() {
        _projects = cached;
        if (_projectId.isEmpty) _projectId = cached.first['id']!;
        _loadingProjects = false;
      });
    }

    // Tenter de rafraîchir depuis l'API
    try {
      final auth = await AuthService.instance.authHeaders();
      final res = await http.get(
        Uri.parse('${AuthService.instance.apiBaseUrl}/projects'),
        headers: {'Content-Type': 'application/json', ...auth},
      );
      if (res.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(res.body);
        final List<dynamic> data = (body['items'] as List<dynamic>?) ?? [body];
        final fresh = data.map<Map<String, String>>((p) => {
          'id': p['id']?.toString() ?? '',
          'name': p['name']?.toString() ?? p['nom']?.toString() ?? ''
        }).where((p) => p['id']!.isNotEmpty).toList();

        // Mettre à jour le cache local
        await LocalStore.instance.cacheProjects(fresh);

        if (mounted) {
          setState(() {
            _projects = fresh;
            if (_projectId.isEmpty && fresh.isNotEmpty) {
              _projectId = fresh.first['id']!;
            }
            _loadingProjects = false;
          });
        }
      }
    } catch (_) {
      // Le cache a déjà été chargé, on garde les données locales
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
      if (mounted) setState(() => _locating = false);
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
        const SnackBar(content: Text('Le titre est obligatoire')),
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
        createdAt: DateTime.now().toIso8601String(),
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
            backgroundColor: AppColors.warn,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: ${e.toString().substring(0, 100)}'),
            backgroundColor: AppColors.critical,
          ),
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
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          // Toolbar
          Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Nouvelle NCR', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                    Text('Saisie terrain hors-ligne', style: TextStyle(fontSize: 12, color: AppColors.textSoft)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.ok.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('OFFLINE', style: TextStyle(color: AppColors.ok, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Chantier
          _loadingProjects
              ? const LinearProgressIndicator(backgroundColor: AppColors.line, color: AppColors.primary)
              : Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.input,
                    border: Border.all(color: AppColors.lineFocus),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButtonFormField<String>(
                    initialValue: _projectId.isNotEmpty ? _projectId : null,
                    decoration: const InputDecoration(
                      labelText: 'Chantier',
                      border: InputBorder.none,
                      filled: false,
                    ),
                    dropdownColor: AppColors.input,
                    items: _projects.map((p) => DropdownMenuItem(
                      value: p['id'],
                      child: Text(p['name'] ?? p['id'] ?? '', style: const TextStyle(fontSize: 14)),
                    )).toList(),
                    onChanged: (val) { if (val != null) setState(() => _projectId = val); },
                  ),
                ),
          const SizedBox(height: 10),

          // GPS card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.card,
              border: Border.all(color: AppColors.line),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.location_on, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Position GPS', style: TextStyle(fontSize: 12, color: AppColors.textSoft)),
                      const SizedBox(height: 2),
                      _locating
                          ? const Text('Acquisition...', style: TextStyle(color: AppColors.warn, fontSize: 13))
                          : Text('${_latitude.toStringAsFixed(5)}°N, ${_longitude.toStringAsFixed(5)}°E',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                if (_locating)
                  const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.warn))
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.ok.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: const Text('OK', style: TextStyle(color: AppColors.ok, fontSize: 11, fontWeight: FontWeight.w700)),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Photo
          InkWell(
            onTap: _pickPhoto,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              height: 170,
              decoration: BoxDecoration(
                color: _photo != null ? Colors.transparent : AppColors.input,
                borderRadius: BorderRadius.circular(10),
                border: _photo == null ? Border.all(color: AppColors.lineFocus) : null,
                image: _photo != null
                    ? DecorationImage(image: FileImage(_photo!), fit: BoxFit.cover)
                    : null,
              ),
              child: _photo == null
                  ? const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.photo_camera, size: 40, color: AppColors.textSoft),
                        SizedBox(height: 8),
                        Text('AJOUTER UNE PHOTO', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textSoft)),
                        SizedBox(height: 4),
                        Text('Obligatoire', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      ],
                    )
                  : Align(
                      alignment: Alignment.topRight,
                      child: IconButton(
                        icon: const Icon(Icons.refresh, color: Colors.white, size: 28),
                        onPressed: _pickPhoto,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 10),

          // Title
          TextField(
            controller: _titleController,
            decoration: const InputDecoration(
              labelText: 'Titre du signalement',
              hintText: 'Ex: défaut de sécurité échafaudage...',
            ),
          ),
          const SizedBox(height: 10),

          // Severity + Description
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.input,
                    border: Border.all(color: AppColors.lineFocus),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButtonFormField<String>(
                    initialValue: _severity,
                    decoration: const InputDecoration(labelText: 'Gravité', border: InputBorder.none, filled: false),
                    dropdownColor: AppColors.input,
                    items: const [
                      DropdownMenuItem(value: 'MINOR', child: Text('Mineure')),
                      DropdownMenuItem(value: 'MAJOR', child: Text('Majeure')),
                      DropdownMenuItem(value: 'CRITICAL', child: Text('Critique')),
                    ],
                    onChanged: (value) { if (value != null) setState(() => _severity = value); },
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Description
          TextField(
            controller: _descriptionController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Description'),
          ),
          const SizedBox(height: 18),

          // Save button
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
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save, size: 18),
              label: Text(_saving ? 'Enregistrement...' : 'ENREGISTRER EN LOCAL', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Synchronisation automatique au retour du réseau',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
