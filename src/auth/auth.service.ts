import { Role } from '../../libs/domain/src/models';

type SessionInput = {
  email: string;
  password: string;
  mfaCode?: string;
};

type UserRecord = {
  email: string;
  password: string;
  role: Role;
  mfaRequired: boolean;
};

export class AuthService {
  private readonly users: UserRecord[] = [
    { email: 'chef@buildflow.io', password: 'password', role: 'CHEF_CHANTIER', mfaRequired: true },
    { email: 'qse@buildflow.io', password: 'password', role: 'RESPONSABLE_QSE', mfaRequired: true },
    { email: 'direction@buildflow.io', password: 'password', role: 'DIRECTION_TRAVAUX', mfaRequired: true },
    { email: 'admin@buildflow.io', password: 'password', role: 'ADMIN', mfaRequired: true }
  ];

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
      issuer: process.env.OIDC_ISSUER ?? 'buildflow',
      audience: process.env.OIDC_AUDIENCE ?? 'buildflow-api',
      jwksUri: process.env.OIDC_JWKS_URI ?? 'https://auth.buildflow.local/.well-known/jwks.json'
    };
  }

  createSession(input: SessionInput): {
    accessToken: string;
    role: Role;
    mfaValidated: boolean;
  } {
    const user = this.users.find((candidate) => candidate.email === input.email);
    if (!user || user.password !== input.password) {
      throw new Error('Identifiants invalides');
    }
    if (user.mfaRequired && input.mfaCode !== '123456') {
      throw new Error('Code MFA invalide');
    }

    const tokenPayload = `${user.email}:${user.role}:${Date.now()}`;
    const accessToken = Buffer.from(tokenPayload).toString('base64url');
    return {
      accessToken,
      role: user.role,
      mfaValidated: true
    };
  }
}
