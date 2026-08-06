import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../models/local_report.dart';

class LocalStore {
  static final LocalStore instance = LocalStore._();
  LocalStore._();

  Database? _db;

  Future<Database> _database() async {
    if (_db != null) return _db!;

    final dbPath = join(await getDatabasesPath(), 'buildflow_mobile.db');

    _db = await openDatabase(
      dbPath,
      version: 4,
      onCreate: (database, _) async {
        await database.execute('''
          CREATE TABLE IF NOT EXISTS local_reports (
            local_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            severity TEXT NOT NULL,
            photo_path TEXT,
            latitude REAL NOT NULL DEFAULT 0,
            longitude REAL NOT NULL DEFAULT 0,
            project_id TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING',
            version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
          )
        ''');
        await database.execute('''
          CREATE TABLE IF NOT EXISTS projects_cache (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        ''');
      },
      onUpgrade: (database, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await database.execute('ALTER TABLE local_reports ADD COLUMN photo_path TEXT');
          await database.execute('ALTER TABLE local_reports ADD COLUMN latitude REAL NOT NULL DEFAULT 0');
          await database.execute('ALTER TABLE local_reports ADD COLUMN longitude REAL NOT NULL DEFAULT 0');
        }
        if (oldVersion < 3) {
          await database.execute('ALTER TABLE local_reports ADD COLUMN project_id TEXT');
        }
        if (oldVersion < 4) {
          await database.execute('''
            CREATE TABLE IF NOT EXISTS projects_cache (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          ''');
        }
      }
    );

    return _db!;
  }

  Future<void> savePendingReport(LocalReport report) async {
    final db = await _database();
    await db.insert(
      'local_reports',
      report.toDbMap(),
      conflictAlgorithm: ConflictAlgorithm.replace
    );
  }

  Future<List<Map<String, Object?>>> listReports() async {
    final db = await _database();
    return db.query('local_reports', orderBy: 'created_at DESC');
  }

  Future<void> updateStatus(String localId, String status, int nextVersion) async {
    final db = await _database();
    await db.update(
      'local_reports',
      {'status': status, 'version': nextVersion},
      where: 'local_id = ?',
      whereArgs: [localId]
    );
  }

  /// Cache la liste des chantiers en local pour le mode hors-ligne.
  Future<void> cacheProjects(List<Map<String, String>> projects) async {
    final db = await _database();
    final batch = db.batch();
    batch.delete('projects_cache');
    final now = DateTime.now().toIso8601String();
    for (final p in projects) {
      batch.insert('projects_cache', {
        'id': p['id'],
        'name': p['name'],
        'updated_at': now,
      });
    }
    await batch.commit(noResult: true);
  }

  /// Retourne la liste des chantiers depuis le cache local.
  Future<List<Map<String, String>>> cachedProjects() async {
    final db = await _database();
    final rows = await db.query('projects_cache', orderBy: 'name ASC');
    return rows.map((r) => {
      'id': r['id'] as String,
      'name': r['name'] as String,
    }).toList();
  }
}
