import { SignJWT, jwtVerify } from 'jose';
import { Role } from '../../libs/domain/src/models';


/**
 * Valeur sur laquelle le code retombait jusqu'ici quand JWT_SECRET était absent.
 * Elle est publiée dans le dépôt : un jeton signé avec elle doit être traité
 * comme forgé, jamais comme une session légitime.
 */
const PUBLISHED_FALLBACK_SECRET = 'buildflow-dev-secret-change-in-production';

/** En dessous de cette longueur, un secret HS256 se bruteforce hors ligne. */
const MIN_SECRET_LENGTH = 32;

const JWT_ISSUER = process.env.OIDC_ISSUER ?? 'buildflow';
const JWT_AUDIENCE = process.env.OIDC_AUDIENCE ?? 'buildflow-api';

function isRelaxedEnvironment(): boolean {
  const env = process.env.NODE_ENV;
  return env === 'development' || env === 'test';
}

/**
 * Résout la clé de signature des jetons, en échouant plutôt qu'en devinant.
 *
 * Avant ce correctif, l'absence de `JWT_SECRET` faisait silencieusement retomber
 * la signature sur `PUBLISHED_FALLBACK_SECRET` — et `docker-compose.yml` ne
 * définissait pas la variable. Le déploiement livré tournait donc avec un secret
 * lisible dans le dépôt : n'importe qui pouvait signer un jeton `ADMIN` pour un
 * sujet inexistant et obtenir 200 sur `/ncr` comme sur `/audit/logs`.
 *
 * Le repli n'est désormais toléré qu'avec `NODE_ENV=development` ou `test`. Une
 * variable `NODE_ENV` absente est traitée comme un environnement non fiable :
 * le comportement par omission doit être le refus, pas l'acceptation.
 */
export function resolveJwtSecret(): Uint8Array {
  const configured = process.env.JWT_SECRET?.trim();
  const relaxed = isRelaxedEnvironment();

  if (!configured) {
    if (!relaxed) {
      throw new Error(
        'JWT_SECRET est absent. Le secret de signature des jetons doit être fourni ' +
          `explicitement hors développement (NODE_ENV=${process.env.NODE_ENV ?? 'non défini'}). ` +
          'Générer une valeur avec : openssl rand -hex 32'
      );
    }
    return new TextEncoder().encode(PUBLISHED_FALLBACK_SECRET);
  }

  if (!relaxed && configured === PUBLISHED_FALLBACK_SECRET) {
    throw new Error(
      'JWT_SECRET reprend la valeur de développement publiée dans le dépôt, connue ' +
        'de quiconque peut lire le code. Générer un secret propre : openssl rand -hex 32'
    );
  }

  if (!relaxed && configured.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET est trop court (${configured.length} caractères, minimum ` +
        `${MIN_SECRET_LENGTH}). Générer une valeur avec : openssl rand -hex 32`
    );
  }

  return new TextEncoder().encode(configured);
}

export class AuthService {

  getConfig(): {
    provider: string;
    mfaEnabled: boolean;
    mode: string;
    issuer: string;
    audience: string;
    jwksUri: string;
  } {
    return {
      provider: process.env.OIDC_PROVIDER ?? 'https://auth.buildflow.local',
      mfaEnabled: true,
      mode: 'OIDC+MFA',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      jwksUri: process.env.OIDC_JWKS_URI ?? 'https://auth.buildflow.local/.well-known/jwks.json'
    };
  }

  /**
   * Émet un jeton de session pour une identité **déjà vérifiée**.
   *
   * Cette méthode ne connaît plus aucun compte : elle remplace un
   * `createSession` qui portait quatre utilisateurs dans un tableau en mémoire
   * et comparait les mots de passe en clair. La vérification des identifiants
   * appartient désormais à la couche qui a accès à la base — ce module ne
   * s'occupe que de la signature.
   */
  async issueToken(identity: {
    email: string;
    role: Role;
    mfaValidated: boolean;
  }): Promise<{
    accessToken: string;
    role: Role;
    mfaValidated: boolean;
  }> {
    const accessToken = await new SignJWT({
      roles: [identity.role],
      amr: identity.mfaValidated ? ['pwd', 'mfa'] : ['pwd']
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(identity.email)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(resolveJwtSecret());

    return {
      accessToken,
      role: identity.role,
      mfaValidated: identity.mfaValidated
    };
  }

  async verifyLocalToken(token: string): Promise<{ valid: boolean; roles: Role[]; mfaValidated: boolean }> {
    try {
      // La résolution est volontairement dans le `try` : une configuration
      // invalide doit se traduire par un refus d'authentification, pas par une
      // exception qui remonterait en 500.
      const { payload } = await jwtVerify(token, resolveJwtSecret(), {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      });
      const roles = Array.isArray(payload['roles']) ? payload['roles'].map(String) as Role[] : [];
      const amr = Array.isArray(payload['amr']) ? payload['amr'].map(String) : [];
      return {
        valid: true,
        roles: roles.filter(r => ['CHEF_CHANTIER', 'RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN'].includes(r)),
        mfaValidated: amr.includes('mfa') || amr.includes('otp')
      };
    } catch {
      return { valid: false, roles: [], mfaValidated: false };
    }
  }
}
