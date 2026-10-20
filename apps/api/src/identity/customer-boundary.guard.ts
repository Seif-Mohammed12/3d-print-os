import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CUSTOMER_ACCESS_KEY, IS_PUBLIC_KEY, type AuthenticatedRequest } from './auth.decorators';
import type { RequestAuthContext } from './auth.types';

const STAFF_ROLES = new Set(['owner', 'admin', 'employee']);

/** A portal customer: holds the customer role and no staff role. */
export function isCustomerOnly(auth: Pick<RequestAuthContext, 'roles'>): boolean {
  return auth.roles.includes('customer') && !auth.roles.some((role) => STAFF_ROLES.has(role));
}

/**
 * Staff endpoints (quotes, orders, pricing, customers, ...) return internal costs and other
 * customers' data, and most of them check no permission. Rather than rely on every staff
 * route remembering a permission, customer tokens are denied by default and only reach
 * routes marked @CustomerAccess().
 */
@Injectable()
export class CustomerBoundaryGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }
    const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (!auth || !isCustomerOnly(auth)) {
      return true;
    }
    if (this.reflector.getAllAndOverride<boolean>(CUSTOMER_ACCESS_KEY, targets)) {
      return true;
    }
    throw new ForbiddenException({
      code: 'auth.staff_only',
      message: 'This endpoint is not available to customer accounts',
    });
  }
}
