// Miroir des permissions du backend (voir controllers NestJS).
// À utiliser dans l'UI pour masquer les éléments non autorisés.

bool peutCreerNcr(String? role) {
  if (role == null) return false;
  return ['CHEF_CHANTIER', 'RESPONSABLE_QSE', 'ADMIN'].contains(role);
}

bool peutListerNcr(String? role) {
  if (role == null) return false;
  return ['RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN'].contains(role);
}

bool peutCreerChantier(String? role) {
  if (role == null) return false;
  return ['DIRECTION_TRAVAUX', 'ADMIN'].contains(role);
}
