import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService as DomainAuthService } from '../../../../../src/auth/auth.service';
import { OidcVerifierService } from './oidc-verifier.service';

@Injectable()
export class AuthService {
  private readonly domainService = new DomainAuthService();
  constructor(private readonly oidcVerifier: OidcVerifierService) {}

  getConfig(): ReturnType<DomainAuthService['getConfig']> {
    return this.domainService.getConfig();
  }

  async createSession(input: { email: string; password: string; mfaCode?: string }) {
    try {
      return await this.domainService.createSession(input);
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes('MFA_REQUIRED')) {
        throw new UnauthorizedException(message);
      }
      throw new UnauthorizedException(message);
    }
  }

  async validateBearerToken(token: string): Promise<{ valid: boolean; roles: string[]; mfaValidated: boolean }> {
    // Try OIDC remote verification first
    const identity = await this.oidcVerifier.verifyBearerToken(token);
    if (identity) {
      return {
        valid: true,
        roles: identity.roles,
        mfaValidated: identity.mfaValidated
      };
    }

    // Fallback: verify locally-signed JWT (dev mode)
    const local = await this.domainService.verifyLocalToken(token);
    if (local.valid) {
      return local;
    }

    return {
      valid: false,
      roles: [],
      mfaValidated: false
    };
  }
}
