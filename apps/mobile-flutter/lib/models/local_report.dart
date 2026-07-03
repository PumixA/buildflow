class LocalReport {
  final String localId;
  final String title;
  final String description;
  final String severity;
  final String? photoPath;
  final double latitude;
  final double longitude;
  final String status;
  final int version;
  final String createdAt;

  const LocalReport({
    required this.localId,
    required this.title,
    required this.description,
    required this.severity,
    this.photoPath,
    this.latitude = 0,
    this.longitude = 0,
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
      'photo_path': photoPath,
      'latitude': latitude,
      'longitude': longitude,
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
      photoPath: map['photo_path'] as String?,
      latitude: (map['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 0,
      status: map['status'] as String,
      version: map['version'] as int,
      createdAt: map['created_at'] as String
    );
  }
}
