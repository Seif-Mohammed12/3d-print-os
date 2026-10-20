import { Body, Controller, Get, Inject, Post } from '@nestjs/common';

import { AuthDomainError, type AuthService } from '@3d-print-os/identity';

import { AppError } from '../shared/errors/app.error';
import { CurrentAuth, CustomerAccess, Public } from './auth.decorators';
import type { RequestAuthContext } from './auth.types';
import { LoginDto, LogoutDto, RefreshDto, RegisterDto, CustomerRegisterDto } from './dto/auth.dto';
import { AUTH_SERVICE } from './identity.tokens';

function mapAuthError(error: unknown): never {
  if (error instanceof AuthDomainError) {
    throw new AppError({
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    });
  }
  throw error;
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    try {
      const result = await this.authService.register({
        email: body.email,
        password: body.password,
        fullName: body.fullName,
        tenantName: body.tenantName,
        tenantSlug: body.tenantSlug,
        shopName: body.shopName,
        ...(body.shopCode !== undefined ? { shopCode: body.shopCode } : {}),
        ...(body.defaultCurrency !== undefined ? { defaultCurrency: body.defaultCurrency } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      });
      return {
        data: {
          user: {
            id: result.session.user.id,
            email: result.session.user.email,
            full_name: result.session.user.fullName,
          },
          tenant: {
            id: result.session.tenant.id,
            slug: result.session.tenant.slug,
            name: result.session.tenant.name,
          },
          roles: result.session.roles,
          permissions: result.session.permissions,
          tokens: {
            access_token: result.tokens.accessToken,
            refresh_token: result.tokens.refreshToken,
            expires_in: result.tokens.expiresInSeconds,
            token_type: result.tokens.tokenType,
          },
        },
      };
    } catch (error) {
      mapAuthError(error);
    }
  }

  @Public()
  @Post('register-customer')
  async registerCustomer(@Body() body: CustomerRegisterDto) {
    try {
      const result = await this.authService.registerCustomer({
        email: body.email,
        password: body.password,
        fullName: body.fullName,
        tenantSlug: body.tenantSlug,
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
      });
      return {
        data: {
          user: {
            id: result.session.user.id,
            email: result.session.user.email,
            full_name: result.session.user.fullName,
          },
          tenant: {
            id: result.session.tenant.id,
            slug: result.session.tenant.slug,
            name: result.session.tenant.name,
          },
          roles: result.session.roles,
          permissions: result.session.permissions,
          tokens: {
            access_token: result.tokens.accessToken,
            refresh_token: result.tokens.refreshToken,
            expires_in: result.tokens.expiresInSeconds,
            token_type: result.tokens.tokenType,
          },
        },
      };
    } catch (error) {
      mapAuthError(error);
    }
  }

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    try {
      const result = await this.authService.login({
        email: body.email,
        password: body.password,
        ...(body.tenantSlug !== undefined ? { tenantSlug: body.tenantSlug } : {}),
      });
      return {
        data: {
          user: {
            id: result.session.user.id,
            email: result.session.user.email,
            full_name: result.session.user.fullName,
          },
          tenant: {
            id: result.session.tenant.id,
            slug: result.session.tenant.slug,
            name: result.session.tenant.name,
          },
          roles: result.session.roles,
          permissions: result.session.permissions,
          tokens: {
            access_token: result.tokens.accessToken,
            refresh_token: result.tokens.refreshToken,
            expires_in: result.tokens.expiresInSeconds,
            token_type: result.tokens.tokenType,
          },
        },
      };
    } catch (error) {
      mapAuthError(error);
    }
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    try {
      const result = await this.authService.refresh(body.refreshToken);
      return {
        data: {
          tokens: {
            access_token: result.tokens.accessToken,
            refresh_token: result.tokens.refreshToken,
            expires_in: result.tokens.expiresInSeconds,
            token_type: result.tokens.tokenType,
          },
          tenant: {
            id: result.session.tenant.id,
            slug: result.session.tenant.slug,
            name: result.session.tenant.name,
          },
        },
      };
    } catch (error) {
      mapAuthError(error);
    }
  }

  @Public()
  @Post('logout')
  async logout(@Body() body: LogoutDto) {
    try {
      await this.authService.logout(body.refreshToken);
      return { data: { success: true } };
    } catch (error) {
      mapAuthError(error);
    }
  }

  @Get('me')
  @CustomerAccess()
  async me(@CurrentAuth() auth: RequestAuthContext) {
    try {
      const session = await this.authService.getSession(auth.userId, auth.tenantId);
      return {
        data: {
          user: {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.fullName,
          },
          tenant: {
            id: session.tenant.id,
            slug: session.tenant.slug,
            name: session.tenant.name,
          },
          membership_id: session.membershipId,
          roles: session.roles,
          permissions: session.permissions,
          default_shop_id: session.defaultShopId,
        },
      };
    } catch (error) {
      mapAuthError(error);
    }
  }
}
