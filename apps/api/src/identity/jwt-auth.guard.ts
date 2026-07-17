import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY, type AuthenticatedRequest } from './auth.decorators';
import { JwtTokenIssuer } from './jwt-token.issuer';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: JwtTokenIssuer,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'auth.missing_token',
        message: 'Missing bearer token',
      });
    }

    const token = header.slice('Bearer '.length).trim();
    try {
      const claims = await this.tokens.verifyAccessToken(token);
      if (claims.typ !== 'access') {
        throw new UnauthorizedException({
          code: 'auth.invalid_token',
          message: 'Invalid access token',
        });
      }
      request.auth = {
        userId: claims.sub,
        tenantId: claims.tid,
        roles: claims.roles ?? [],
        permissions: claims.permissions ?? [],
      };
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'auth.invalid_token',
        message: 'Invalid or expired access token',
      });
    }
  }
}
