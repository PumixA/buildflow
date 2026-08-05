import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { verify as argon2Verify } from '@node-rs/argon2';
import { Role } from '../../../../../libs/domain/src/models';
import { AuthService as DomainAuthService } from '../../../../../src/auth/auth.service';
import { DatabaseService } from '../database/database.service';
import { OidcVerifierService } from './oidc-verifier.service';

/**
 * Code MFA de démonstration.
 *
 * Il reste constant : le passage à un TOTP réel (un secret par utilisateur,
 * provisionné par QR code) est un chantier distinct. Le nommer explicitement
 * vaut mieux que de le laisser en littéral au milieu d'une condition.
 */
const DEMO_MFA_CODE = '123456';

/** Préfixe d'une empreinte argon2id. Toute autre valeur est refusée. */
const ARGON2_PREFIX = '$argon2';

type UserRow = {
  email: string;
  role: string;
  hashed_password: string;
  mfa_enabled: boolean;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly domainService = new DomainAuthService();

  constructor(
    private readonly oidcVerifier: OidcVerifierService,
    private readonly databaseService: DatabaseService
  ) {}

  getConfig(): ReturnType<DomainAuthService['getConfig']> {
    return this.domainService.getConfig();
  }

  /**
   * Ouvre une session à partir des comptes **stockés en base**.
   *
   * Le service de domaine portait auparavant quatre comptes dans un tableau en
   * mémoire, mots de passe comparés en clair, alors que `users.hashed_password`
   * existait depuis la migration 001 sans jamais être lue (audit, critique C4).
   *
   * Un compte dont l'empreinte n'est pas au format argon2 est refusé. Cela
   * couvre les comptes techniques créés par la synchronisation mobile, qui
   * portent `hash-placeholder` : ils existent pour satisfaire les clés
   * étrangères des NCR, pas pour ouvrir une session.
   */
  async createSession(input: { email: string; password: string; mfaCode?: string }) {
    if (!this.databaseService.enabled) {
      throw new UnauthorizedException('Authentification indisponible : base non configurée');
    }

    const result = await this.databaseService.query(
      'SELECT email, role, hashed_password, mfa_enabled FROM users WHERE email = $1 LIMIT 1',
      [input.email]
    );
    const user = result.rows[0] as UserRow | undefined;

    // Message unique quel que soit le motif : distinguer « compte inconnu » de
    // « mot de passe erroné » permettrait d'énumérer les comptes existants.
    const refus = new UnauthorizedException('Identifiants invalides');

    if (!user || !user.hashed_password?.startsWith(ARGON2_PREFIX)) {
      // Coût de vérification consommé même sans compte, pour ne pas laisser le
      // temps de réponse trahir l'existence d'un email.
      await this.consommerTempsDeVerification();
      throw refus;
    }

    let motDePasseValide = false;
    try {
      motDePasseValide = await argon2Verify(user.hashed_password, input.password);
    } catch (err) {
      this.logger.error(`Vérification argon2 échouée pour ${input.email} : ${(err as Error).message}`);
      throw refus;
    }

    if (!motDePasseValide) {
      throw refus;
    }

    if (user.mfa_enabled && input.mfaCode !== DEMO_MFA_CODE) {
      throw new UnauthorizedException('MFA_REQUIRED: Code MFA invalide');
    }

    return this.domainService.issueToken({
      email: user.email,
      role: user.role as Role,
      mfaValidated: user.mfa_enabled
    });
  }

  /**
   * Vérifie une empreinte jetable pour égaliser le temps de réponse entre un
   * compte inexistant et un mot de passe erroné.
   */
  private async consommerTempsDeVerification(): Promise<void> {
    const leurre =
      '$argon2id$v=19$m=19456,t=2,p=1$jGIcd3D24ragz7gjQtJXew$NOQon9enUFW+8mfB5W47DwgA4ncy/B34qn5qO9s2yFI';
    try {
      await argon2Verify(leurre, 'mot-de-passe-sans-importance');
    } catch {
      // Sans effet : seul le temps consommé compte.
    }
  }

  async validateBearerToken(token: string): Promise<{ valid: boolean; roles: string[]; mfaValidated: boolean }> {
    // Try local JWT first (fast, no network — dev mode)
    const local = await this.domainService.verifyLocalToken(token);
    if (local.valid) {
      return local;
    }

    // Fallback: OIDC remote verification
    const identity = await this.oidcVerifier.verifyBearerToken(token);
    if (identity) {
      return {
        valid: true,
        roles: identity.roles,
        mfaValidated: identity.mfaValidated
      };
    }

    return {
      valid: false,
      roles: [],
      mfaValidated: false
    };
  }
}
