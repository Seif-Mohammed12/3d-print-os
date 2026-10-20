import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

import type { RequestAuthContext } from './auth.types';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';
export const CUSTOMER_ACCESS_KEY = 'customerAccess';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Opens a route to portal customers. Every other authenticated route is staff-only: the
 * CustomerBoundaryGuard rejects customer tokens there, whatever permissions they carry.
 */
export const CustomerAccess = () => SetMetadata(CUSTOMER_ACCESS_KEY, true);

export type AuthenticatedRequest = Request & {
  auth?: RequestAuthContext;
};

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestAuthContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new Error('Missing auth context');
    }
    return request.auth;
  },
);
