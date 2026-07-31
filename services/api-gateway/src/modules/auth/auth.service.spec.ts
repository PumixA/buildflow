import { UnauthorizedException } from '@nestjs/common';
import { hash as argon2Hash } from '@node-rs/argon2';
import { QueryResult } from 'pg';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';
import { OidcVerifierService } from './oidc-verifier.service';

function resultat(rows: Array<Record<string, unknown>>): QueryResult<Record<string, unknown>> {
  return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] };
}

function construire(user?: Record<string, unknown>, options: { enabled?: boolean } = {}): AuthService {
  const database = {
    get enabled() {
      return options.enabled ?? true;
    },
    query: () => Promise.resolve(user ? resultat([user]) : resultat([]))
  } as unknown as DatabaseService;

  const oidc = { verifyBearerToken: () => Promise.resolve(null) } as unknown as OidcVerifierService;
  return new AuthService(oidc, database);
}

const SECRET_VALIDE = 'a'.repeat(64);

describe('AuthService.createSession — comptes en base (C4)', () => {
  const envInitial = { ...process.env };
  let empreinte: string;

  beforeAll(async () => {
    empreinte = await argon2Hash('password');
  });

  beforeEach(() => {
    (process.env as Record<string, string | undefined>)['JWT_SECRET'] = SECRET_VALIDE;
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'test';
  });

  afterEach(() => {
    process.env = { ...envInitial };
  });

  it('doit ouvrir une session sur un mot de passe correct', async () => {
    const service = construire({
      email: 'qse@buildflow.io',
      role: 'RESPONSABLE_QSE',
      hashed_password: empreinte,
      mfa_enabled: true
    });

    const session = await service.createSession({
      email: 'qse@buildflow.io',
      password: 'password',
      mfaCode: '123456'
    });

    expect(session.accessToken).toBeTruthy();
    expect(session.role).toBe('RESPONSABLE_QSE');
    expect(session.mfaValidated).toBe(true);
  });

  it('doit refuser un mot de passe erroné', async () => {
    const service = construire({
      email: 'qse@buildflow.io',
      role: 'RESPONSABLE_QSE',
      hashed_password: empreinte,
      mfa_enabled: true
    });

    await expect(
      service.createSession({ email: 'qse@buildflow.io', password: 'mauvais', mfaCode: '123456' })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('doit refuser un compte inexistant sans révéler qu’il n’existe pas', async () => {
    const service = construire(undefined);

    await expect(
      service.createSession({ email: 'inconnu@buildflow.io', password: 'password', mfaCode: '123456' })
    ).rejects.toThrow(/Identifiants invalides/);
  });

  it('doit refuser un compte technique portant hash-placeholder', async () => {
    // Les comptes créés par la synchronisation mobile existent pour satisfaire
    // les clés étrangères des NCR, pas pour ouvrir une session.
    const service = construire({
      email: 'usrqse@buildflow.local',
      role: 'RESPONSABLE_QSE',
      hashed_password: 'hash-placeholder',
      mfa_enabled: true
    });

    await expect(
      service.createSession({ email: 'usrqse@buildflow.local', password: 'password', mfaCode: '123456' })
    ).rejects.toThrow(/Identifiants invalides/);
  });

  it('doit exiger le code MFA quand le compte l’impose', async () => {
    const service = construire({
      email: 'admin@buildflow.io',
      role: 'ADMIN',
      hashed_password: empreinte,
      mfa_enabled: true
    });

    await expect(
      service.createSession({ email: 'admin@buildflow.io', password: 'password', mfaCode: '000000' })
    ).rejects.toThrow(/MFA_REQUIRED/);
  });

  it('doit refuser d’authentifier si la base est indisponible', async () => {
    // Fail-closed : sans référentiel, on ne devine pas — on refuse.
    const service = construire(undefined, { enabled: false });

    await expect(
      service.createSession({ email: 'qse@buildflow.io', password: 'password', mfaCode: '123456' })
    ).rejects.toThrow(/base non configurée/);
  });

  it('doit tirer le rôle de la base et non d’une liste codée en dur', async () => {
    // `admin@buildflow.io` portait le rôle CHEF_CHANTIER en base alors que
    // l'authentification le traitait en ADMIN : les deux référentiels avaient
    // divergé. La base fait désormais foi.
    const service = construire({
      email: 'admin@buildflow.io',
      role: 'DIRECTION_TRAVAUX',
      hashed_password: empreinte,
      mfa_enabled: false
    });

    const session = await service.createSession({ email: 'admin@buildflow.io', password: 'password' });

    expect(session.role).toBe('DIRECTION_TRAVAUX');
  });
});
