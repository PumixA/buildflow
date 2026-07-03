import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../../../libs/domain/src/models';
import { AuthService } from './auth.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
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
      const result = await this.authService.validateBearerToken(token);
      if (!result.valid) {
        throw new UnauthorizedException('Token invalide');
      }
      if (!result.mfaValidated && requiredRoles.length > 0) {
        throw new ForbiddenException('MFA requis');
      }
      if (result.roles.some((role) => requiredRoles.includes(role as Role))) {
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
