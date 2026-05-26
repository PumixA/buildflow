import 'package:path/path.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/local_report.dart';

class LocalStore {
  static final LocalStore instance = LocalStore._();
  LocalStore._();

  Database? _db;

  Future<Database> _database() async {
    if (_db != null) {
      return _db!;
    }

    sqfliteFfiInit();
    final databaseFactory = databaseFactoryFfi;
    final dbPath = join(await databaseFactory.getDatabasesPath(), 'buildflow_mobile.db');

    _db = await databaseFactory.openDatabase(
      dbPath,
      options: OpenDatabaseOptions(
        version: 1,
        onCreate: (database, _) async {
          await database.execute('''
            CREATE TABLE IF NOT EXISTS local_reports (
              local_id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              severity TEXT NOT NULL,
              photos INTEGER NOT NULL,
              status TEXT NOT NULL,
              version INTEGER NOT NULL,
              created_at TEXT NOT NULL
            )
          ''');
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

  Future<List<LocalReport>> listReports() async {
    final db = await _database();
    final rows = await db.query('local_reports', orderBy: 'created_at DESC');
    return rows.map(LocalReport.fromDbMap).toList();
  }

  Future<void> updateStatus(String localId, String status, int nextVersion) async {
    final db = await _database();
    await db.update(
      'local_reports',
      {
        'status': status,
        'version': nextVersion
      },
      where: 'local_id = ?',
      whereArgs: [localId]
    );
  }
}
