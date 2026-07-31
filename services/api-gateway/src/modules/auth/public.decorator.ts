import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = 'isPublic';

/**
 * Ouvre explicitement une route à l'accès non authentifié.
 *
 * `RolesGuard` exige une authentification par défaut. Sans ce décorateur, une
 * route nouvellement ajoutée est protégée — l'oubli produit un 401 visible en
 * développement, jamais une fuite silencieuse en production.
 *
 * C'est l'inverse du comportement précédent : le guard laissait passer toute
 * route dépourvue de `@Roles`, si bien que `GET /reporting/kpi` répondait 200
 * sans le moindre en-tête (audit, point H3).
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(PUBLIC_KEY, true);
