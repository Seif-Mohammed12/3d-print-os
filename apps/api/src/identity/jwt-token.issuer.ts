import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { TokenIssuer } from '@3d-print-os/identity';

import type { AppConfig } from '../config/configuration';
import { APP_CONFIG } from '../config/tokens';
import type { AccessTokenClaims } from './auth.types';

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async signAccessToken(claims: {
    sub: string;
    tid: string;
    roles: string[];
    permissions: string[];
  }): Promise<{ token: string; expiresInSeconds: number }> {
    const payload: AccessTokenClaims = {
      ...claims,
      typ: 'access',
    };
    const expiresInSeconds = this.config.jwtAccessTtlSeconds;
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.jwtAccessSecret,
      expiresIn: expiresInSeconds,
    });
    return { token, expiresInSeconds };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    return this.jwt.verifyAsync<AccessTokenClaims>(token, {
      secret: this.config.jwtAccessSecret,
    });
  }
}
