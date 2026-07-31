import { SignJWT } from 'jose';
import { AuthService, resolveJwtSecret } from './auth.service';

const PUBLISHED_FALLBACK_SECRET = 'buildflow-dev-secret-change-in-production';
const SECRET_VALIDE = 'a'.repeat(64);

/**
 * `process.env.NODE_ENV` est typé en lecture seule ; on passe par la signature
 * d'index pour pouvoir simuler les différents environnements.
 */
function definirEnv(cle: string, valeur: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (valeur === undefined) {
    delete env[cle];
  } else {
    env[cle] = valeur;
  }
}

describe('resolveJwtSecret', () => {
  const envInitial = { ...process.env };

  afterEach(() => {
    process.env = { ...envInitial };
  });

  it('doit refuser de résoudre un secret absent hors développement', () => {
    definirEnv('NODE_ENV', 'production');
    definirEnv('JWT_SECRET', undefined);

    expect(() => resolveJwtSecret()).toThrow(/JWT_SECRET est absent/);
  });

  it('doit refuser un NODE_ENV non défini — le défaut par omission est le refus', () => {
    definirEnv('NODE_ENV', undefined);
    definirEnv('JWT_SECRET', undefined);

    expect(() => resolveJwtSecret()).toThrow(/JWT_SECRET est absent/);
  });

  it('doit refuser le secret de développement publié dans le dépôt', () => {
    definirEnv('NODE_ENV', 'production');
    definirEnv('JWT_SECRET', PUBLISHED_FALLBACK_SECRET);

    expect(() => resolveJwtSecret()).toThrow(/publiée dans le dépôt/);
  });

  it('doit refuser un secret trop court pour du HS256', () => {
    definirEnv('NODE_ENV', 'production');
    definirEnv('JWT_SECRET', 'trop-court');

    expect(() => resolveJwtSecret()).toThrow(/trop court/);
  });

  it('doit accepter un secret explicite suffisamment long', () => {
    definirEnv('NODE_ENV', 'production');
    definirEnv('JWT_SECRET', SECRET_VALIDE);

    expect(resolveJwtSecret()).toEqual(new TextEncoder().encode(SECRET_VALIDE));
  });

  it('doit tolérer le repli en développement pour ne pas gêner le poste local', () => {
    definirEnv('NODE_ENV', 'development');
    definirEnv('JWT_SECRET', undefined);

    expect(resolveJwtSecret()).toEqual(new TextEncoder().encode(PUBLISHED_FALLBACK_SECRET));
  });

  it('doit ignorer une variable vide ou faite d\'espaces', () => {
    definirEnv('NODE_ENV', 'production');
    definirEnv('JWT_SECRET', '   ');

    expect(() => resolveJwtSecret()).toThrow(/JWT_SECRET est absent/);
  });
});

describe('AuthService — non-régression de la faille C2', () => {
  const envInitial = { ...process.env };
  let service: AuthService;

  beforeEach(() => {
    definirEnv('JWT_SECRET', SECRET_VALIDE);
    definirEnv('NODE_ENV', 'production');
    service = new AuthService();
  });

  afterEach(() => {
    process.env = { ...envInitial };
  });

  it('doit rejeter un jeton forgé avec le secret publié dans le dépôt', async () => {
    // Reproduction exacte de l'exploit de l'audit : un sujet qui n'existe dans
    // aucun référentiel, un rôle ADMIN, signé avec la valeur du dépôt.
    const jetonForge = await new SignJWT({ roles: ['ADMIN'], amr: ['pwd', 'mfa'] })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('attacker@evil.com')
      .setIssuer(process.env.OIDC_ISSUER ?? 'buildflow')
      .setAudience(process.env.OIDC_AUDIENCE ?? 'buildflow-api')
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(PUBLISHED_FALLBACK_SECRET));

    const résultat = await service.verifyLocalToken(jetonForge);

    expect(résultat.valid).toBe(false);
    expect(résultat.roles).toEqual([]);
    expect(résultat.mfaValidated).toBe(false);
  });

  it('doit accepter un jeton réellement émis par le service', async () => {
    const session = await service.issueToken({
      email: 'admin@buildflow.io',
      role: 'ADMIN',
      mfaValidated: true
    });

    const résultat = await service.verifyLocalToken(session.accessToken);

    expect(résultat.valid).toBe(true);
    expect(résultat.roles).toContain('ADMIN');
    expect(résultat.mfaValidated).toBe(true);
  });

  it('doit refléter l’absence de MFA dans la claim amr', async () => {
    const session = await service.issueToken({
      email: 'chef@buildflow.io',
      role: 'CHEF_CHANTIER',
      mfaValidated: false
    });

    const résultat = await service.verifyLocalToken(session.accessToken);

    expect(résultat.valid).toBe(true);
    expect(résultat.mfaValidated).toBe(false);
  });

  it('ne doit plus exposer de vérification d’identifiants', () => {
    // Le service de domaine portait quatre comptes en mémoire et comparait les
    // mots de passe en clair (critique C4). Il ne signe plus que des identités
    // déjà vérifiées par la couche qui a accès à la base.
    expect((service as unknown as Record<string, unknown>).createSession).toBeUndefined();
    expect((service as unknown as Record<string, unknown>).users).toBeUndefined();
  });
});
