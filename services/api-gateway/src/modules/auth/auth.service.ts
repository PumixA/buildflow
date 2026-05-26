import { Injectable } from '@nestjs/common';
import { AuthService as DomainAuthService } from '../../../../../src/auth/auth.service';
import { OidcVerifierService } from './oidc-verifier.service';

@Injectable()
export class AuthService {
  private readonly domainService = new DomainAuthService();
  constructor(private readonly oidcVerifier: OidcVerifierService) {}

  getConfig(): ReturnType<DomainAuthService['getConfig']> {
    return this.domainService.getConfig();
  }

  createSession(input: { email: string; password: string; mfaCode?: string }): ReturnType<DomainAuthService['createSession']> {
    return this.domainService.createSession(input);
  }

  async validateBearerToken(token: string): Promise<{ valid: boolean; roles: string[]; mfaValidated: boolean }> {
    const identity = await this.oidcVerifier.verifyBearerToken(token);
    if (!identity) {
      return {
        valid: false,
        roles: [],
        mfaValidated: false
      };
    }
    return {
      valid: true,
      roles: identity.roles,
      mfaValidated: identity.mfaValidated
    };
  }
}
