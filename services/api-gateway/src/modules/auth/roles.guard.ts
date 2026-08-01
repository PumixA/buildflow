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
import { PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
  ) {}

  /**
   * Guard **fail-closed** : toute route exige une authentification, sauf celles
   * marquées `@Public()`.
   *
   * Le comportement précédent était l'inverse — une route dépourvue de `@Roles`
   * était servie sans contrôle. Ce n'est pas un oubli isolé mais une classe
   * entière d'oublis : ajouter un endpoint sans y penser suffisait à l'exposer.
   * C'est ainsi que `GET /reporting/kpi` répondait 200 sans en-tête (audit, H3).
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

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
      if (!result.mfaValidated) {
        throw new ForbiddenException('MFA requis');
      }
      // Sans `@Roles`, la route est réservée aux porteurs d'un jeton valide,
      // quel que soit leur rôle : authentifié suffit, mais est exigé.
      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }
      if (result.roles.some((role) => requiredRoles.includes(role as Role))) {
        return true;
      }
      throw new ForbiddenException('Rôle insuffisant');
    }

    if (process.env.NODE_ENV === 'development') {
      // Restreindre le bypass x-role aux appels locaux en dev
      const ip = (request as Record<string, unknown>).ip as string | undefined;
      const isLocal = !ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
      const role = request.headers['x-role'];
      if (role && isLocal) {
        const attendus = requiredRoles?.length ? requiredRoles.join(', ') : 'un jeton valide';
        console.warn(`[DEV] x-role bypass used: ${role} for endpoint requiring ${attendus}`);
        if (requiredRoles?.length && !requiredRoles.includes(role as Role)) {
          throw new ForbiddenException('Rôle insuffisant');
        }
        return true;
      }
    }

    throw new UnauthorizedException('Authentification requise — token Bearer manquant');
  }
}
