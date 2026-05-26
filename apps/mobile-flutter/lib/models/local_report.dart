class LocalReport {
  final String localId;
  final String title;
  final String description;
  final String severity;
  final int photos;
  final String status;
  final int version;
  final String createdAt;

  const LocalReport({
    required this.localId,
    required this.title,
    required this.description,
    required this.severity,
    required this.photos,
    required this.status,
    required this.version,
    required this.createdAt
  });

  Map<String, Object?> toDbMap() {
    return {
      'local_id': localId,
      'title': title,
      'description': description,
      'severity': severity,
      'photos': photos,
      'status': status,
      'version': version,
      'created_at': createdAt
    };
  }

  factory LocalReport.fromDbMap(Map<String, Object?> map) {
    return LocalReport(
      localId: map['local_id'] as String,
      title: map['title'] as String,
      description: map['description'] as String,
      severity: map['severity'] as String,
      photos: map['photos'] as int,
      status: map['status'] as String,
      version: map['version'] as int,
      createdAt: map['created_at'] as String
    );
  }
}
