import { Injectable } from '@nestjs/common';
import { JWTPayload, createRemoteJWKSet, jwtVerify } from 'jose';
import { Role } from '../../../../../libs/domain/src/models';

type VerifiedIdentity = {
  sub: string;
  roles: Role[];
  mfaValidated: boolean;
  payload: JWTPayload;
};

@Injectable()
export class OidcVerifierService {
  private readonly issuer = process.env.OIDC_ISSUER;
  private readonly audience = process.env.OIDC_AUDIENCE;
  private readonly jwksUri = process.env.OIDC_JWKS_URI;
  private readonly requireMfa = (process.env.OIDC_REQUIRE_MFA ?? 'false').toLowerCase() === 'true';
  private readonly jwks = this.jwksUri ? createRemoteJWKSet(new URL(this.jwksUri)) : null;

  async verifyBearerToken(token: string): Promise<VerifiedIdentity | null> {
    if (!this.jwks) {
      return null;
    }

    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.audience
    });

    const roles = this.extractRoles(payload);
    const mfaValidated = this.extractMfa(payload);
    return {
      sub: String(payload.sub ?? ''),
      roles,
      mfaValidated,
      payload
    };
  }

  isMfaCompliant(identity: VerifiedIdentity): boolean {
    if (!this.requireMfa) {
      return true;
    }
    return identity.mfaValidated;
  }

  private extractRoles(payload: JWTPayload): Role[] {
    const fromRolesClaim = Array.isArray(payload['roles']) ? payload['roles'] : [];
    const realmAccess = payload['realm_access'] as { roles?: unknown[] } | undefined;
    const fromRealm = Array.isArray(realmAccess?.roles) ? realmAccess?.roles : [];
    const all = [...fromRolesClaim, ...fromRealm].map(String);
    return all.filter((role): role is Role =>
      ['CHEF_CHANTIER', 'RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN'].includes(role)
    );
  }

  private extractMfa(payload: JWTPayload): boolean {
    const amr = Array.isArray(payload['amr']) ? payload['amr'].map(String) : [];
    const acr = String(payload['acr'] ?? '');
    return amr.includes('mfa') || amr.includes('otp') || acr.toLowerCase().includes('mfa');
  }
}
