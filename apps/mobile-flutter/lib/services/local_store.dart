import 'package:path/path.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/local_report.dart';

class LocalStore {
  static final LocalStore instance = LocalStore._();
  LocalStore._();

  Database? _db;

  Future<Database> _database() async {
    if (_db != null) return _db!;

    sqfliteFfiInit();
    final databaseFactory = databaseFactoryFfi;
    final dbPath = join(await databaseFactory.getDatabasesPath(), 'buildflow_mobile.db');

    _db = await databaseFactory.openDatabase(
      dbPath,
      options: OpenDatabaseOptions(
        version: 2,
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
              status TEXT NOT NULL DEFAULT 'PENDING',
              version INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL
            )
          ''');
        },
        onUpgrade: (database, oldVersion, newVersion) async {
          if (oldVersion < 2) {
            await database.execute('ALTER TABLE local_reports ADD COLUMN photo_path TEXT');
            await database.execute('ALTER TABLE local_reports ADD COLUMN latitude REAL NOT NULL DEFAULT 0');
            await database.execute('ALTER TABLE local_reports ADD COLUMN longitude REAL NOT NULL DEFAULT 0');
          }
        }
      )
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
}
