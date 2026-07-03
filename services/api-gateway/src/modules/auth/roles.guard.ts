import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../../../libs/domain/src/models';
import { OidcVerifierService } from './oidc-verifier.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly oidcVerifier: OidcVerifierService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string; 'x-role'?: string };
    }>();

    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.replace('Bearer ', '');
      const identity = await this.oidcVerifier.verifyBearerToken(token);
      if (!identity) {
        throw new UnauthorizedException('Token invalide');
      }
      if (!this.oidcVerifier.isMfaCompliant(identity)) {
        throw new ForbiddenException('MFA requis');
      }
      if (identity.roles.some((role) => requiredRoles.includes(role))) {
        return true;
      }
      throw new ForbiddenException('Rôle insuffisant');
    }

    if (process.env.NODE_ENV === 'development') {
      const role = request.headers['x-role'];
      if (role) {
        console.warn(`[DEV] x-role bypass used: ${role} for endpoint requiring ${requiredRoles.join(', ')}`);
        if (!requiredRoles.includes(role as Role)) {
          throw new ForbiddenException('Rôle insuffisant');
        }
        return true;
      }
    }

    throw new UnauthorizedException('Authentification requise — token Bearer manquant');
  }
}
