import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';

type Identite = { valid: boolean; roles: string[]; mfaValidated: boolean };

function contexte(headers: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    getHandler: () => () => undefined,
    getClass: () => class {}
  } as unknown as ExecutionContext;
}

function construire(options: {
  isPublic?: boolean;
  roles?: string[] | undefined;
  identite?: Identite;
}): RolesGuard {
  const reflector = {
    getAllAndOverride: (cle: string) => (cle === 'isPublic' ? options.isPublic : options.roles)
  } as unknown as Reflector;

  const auth = {
    validateBearerToken: () =>
      Promise.resolve(options.identite ?? { valid: false, roles: [], mfaValidated: false })
  } as unknown as AuthService;

  return new RolesGuard(reflector, auth);
}

const IDENTITE_VALIDE: Identite = { valid: true, roles: ['ADMIN'], mfaValidated: true };

describe('RolesGuard — fail-closed (H3)', () => {
  const envInitial = { ...process.env };

  afterEach(() => {
    process.env = { ...envInitial };
  });

  it('doit refuser une route sans @Roles quand aucun jeton n’est fourni', async () => {
    // Cœur du correctif : le guard renvoyait `true` dans ce cas, ce qui rendait
    // publique toute route dont on avait oublié le décorateur.
    const guard = construire({ roles: undefined });

    await expect(guard.canActivate(contexte())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('doit accepter une route sans @Roles avec un jeton valide', async () => {
    const guard = construire({ roles: undefined, identite: IDENTITE_VALIDE });

    await expect(guard.canActivate(contexte({ authorization: 'Bearer jeton' }))).resolves.toBe(true);
  });

  it('doit laisser passer une route marquée @Public sans aucun en-tête', async () => {
    const guard = construire({ isPublic: true });

    await expect(guard.canActivate(contexte())).resolves.toBe(true);
  });

  it('doit refuser un jeton invalide', async () => {
    const guard = construire({
      roles: ['ADMIN'],
      identite: { valid: false, roles: [], mfaValidated: false }
    });

    await expect(
      guard.canActivate(contexte({ authorization: 'Bearer forge' }))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('doit exiger la validation MFA même sans rôle requis', async () => {
    const guard = construire({
      roles: undefined,
      identite: { valid: true, roles: ['ADMIN'], mfaValidated: false }
    });

    await expect(
      guard.canActivate(contexte({ authorization: 'Bearer jeton' }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('doit refuser un rôle insuffisant', async () => {
    const guard = construire({
      roles: ['ADMIN'],
      identite: { valid: true, roles: ['CHEF_CHANTIER'], mfaValidated: true }
    });

    await expect(
      guard.canActivate(contexte({ authorization: 'Bearer jeton' }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ne doit pas accepter x-role hors développement', async () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
    const guard = construire({ roles: ['ADMIN'] });

    await expect(guard.canActivate(contexte({ 'x-role': 'ADMIN' }))).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});

/**
 * Garde-fou structurel.
 *
 * Le guard étant fail-closed, oublier un décorateur protège au lieu d'exposer.
 * Le risque restant est inverse : poser `@Public()` sans y penser. Ce test fige
 * la liste des contrôleurs autorisés à être publics ; en ajouter un échoue tant
 * qu'il n'est pas inscrit ici délibérément.
 */
describe('Contrôleurs publics — liste figée', () => {
  const AUTORISES = ['health.controller.ts', 'auth.controller.ts'];

  it('ne doit exposer @Public que sur les contrôleurs prévus', () => {
    const racine = join(__dirname, '..');
    const trouves: string[] = [];

    for (const module of readdirSync(racine, { withFileTypes: true })) {
      if (!module.isDirectory()) continue;
      for (const fichier of readdirSync(join(racine, module.name))) {
        if (!fichier.endsWith('.controller.ts')) continue;
        const contenu = readFileSync(join(racine, module.name, fichier), 'utf-8');
        if (contenu.includes('@Public()')) {
          trouves.push(fichier);
        }
      }
    }

    expect(trouves.sort()).toEqual(AUTORISES.sort());
  });
});
