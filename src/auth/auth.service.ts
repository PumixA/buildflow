import { SignJWT, jwtVerify } from 'jose';
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

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'buildflow-dev-secret-change-in-production'
);
const JWT_ISSUER = process.env.OIDC_ISSUER ?? 'buildflow';
const JWT_AUDIENCE = process.env.OIDC_AUDIENCE ?? 'buildflow-api';

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
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      jwksUri: process.env.OIDC_JWKS_URI ?? 'https://auth.buildflow.local/.well-known/jwks.json'
    };
  }

  async createSession(input: SessionInput): Promise<{
    accessToken: string;
    role: Role;
    mfaValidated: boolean;
  }> {
    const user = this.users.find((candidate) => candidate.email === input.email);
    if (!user || user.password !== input.password) {
      throw new Error('Identifiants invalides');
    }
    if (user.mfaRequired && input.mfaCode !== '123456') {
      throw new Error('MFA_REQUIRED: Code MFA invalide');
    }

    const accessToken = await new SignJWT({
      roles: [user.role],
      amr: user.mfaRequired ? ['pwd', 'mfa'] : ['pwd']
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.email)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    return {
      accessToken,
      role: user.role,
      mfaValidated: true
    };
  }

  async verifyLocalToken(token: string): Promise<{ valid: boolean; roles: Role[]; mfaValidated: boolean }> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
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
