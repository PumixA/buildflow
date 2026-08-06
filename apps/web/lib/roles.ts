/**
 * Configuration centralisée des permissions par rôle.
 *
 * Source unique de vérité — toute l'interface doit passer par ce fichier
 * pour décider quoi afficher / masquer / activer / désactiver.
 *
 * Les rôles sont alignés sur les @Roles() décorateurs de l'API NestJS
 * (voir services/api-gateway/src/modules/...controller.ts).
 */

export type Role = 'CHEF_CHANTIER' | 'RESPONSABLE_QSE' | 'DIRECTION_TRAVAUX' | 'ADMIN';

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/** Peut créer un chantier (POST /projects). */
export function peutCreerChantier(role: string | null): boolean {
  if (!role) return false;
  return (['DIRECTION_TRAVAUX', 'ADMIN'] as string[]).includes(role);
}

/** Peut modifier un chantier (PATCH /projects/:id). */
export function peutEditerChantier(role: string | null): boolean {
  return peutCreerChantier(role);
}

/** Peut lister les NCR (GET /ncr). */
export function peutListerNcr(role: string | null): boolean {
  if (!role) return false;
  return (['RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN'] as string[]).includes(role);
}

/** Peut créer une NCR (POST /ncr). */
export function peutCreerNcr(role: string | null): boolean {
  if (!role) return false;
  return (['CHEF_CHANTIER', 'RESPONSABLE_QSE', 'ADMIN'] as string[]).includes(role);
}

/** Peut modifier une NCR — titre, description, priorité (PATCH /ncr/:id). */
export function peutEditerNcr(role: string | null): boolean {
  if (!role) return false;
  return (['RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN'] as string[]).includes(role);
}

/** Peut changer le statut d'une NCR (PATCH /ncr/:id/status). */
export function peutChangerStatutNcr(role: string | null): boolean {
  return peutEditerNcr(role);
}

/** Peut voir le dashboard HSE (GET /hse/dashboard). */
export function peutVoirHse(role: string | null): boolean {
  if (!role) return false;
  return (['RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN'] as string[]).includes(role);
}

// ---------------------------------------------------------------------------
// Afficher / masquer un élément
// ---------------------------------------------------------------------------

/** Élément visible uniquement pour les rôles autorisés. */
export function visiblePour(role: string | null, autorises: string[]): boolean {
  if (!role) return false;
  return autorises.includes(role);
}
