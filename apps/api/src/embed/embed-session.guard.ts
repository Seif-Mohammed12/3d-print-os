import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import type { EmbedSession } from './embed.repository';
import { EmbedService } from './embed.service';

/** Visitor sessions travel in their own header, never as a bearer token. */
export const EMBED_SESSION_HEADER = 'x-embed-session';

type EmbedRequest = Request & { embedSession?: EmbedSession };

/**
 * Admits a request that carries a live visitor session from an allowed origin. Embed routes
 * are @Public() (no staff JWT), so this guard is the only way in, and a session token is
 * useless anywhere else: JwtAuthGuard doesn't read this header.
 */
@Injectable()
export class EmbedSessionGuard implements CanActivate {
  constructor(private readonly embed: EmbedService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<EmbedRequest>();
    const token = request.header(EMBED_SESSION_HEADER);
    const session = token ? await this.embed.resolveSession(token, request.header('origin')) : null;
    if (!session) {
      throw new UnauthorizedException({
        code: 'embed.session_invalid',
        message: 'Your quoting session has ended. Reload the page to continue.',
      });
    }
    request.embedSession = session;
    return true;
  }
}

export const CurrentEmbedSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): EmbedSession => {
    const session = ctx.switchToHttp().getRequest<EmbedRequest>().embedSession;
    if (!session) {
      throw new Error('Missing embed session');
    }
    return session;
  },
);
