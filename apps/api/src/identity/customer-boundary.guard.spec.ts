import 'reflect-metadata';

import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AnalyticsController } from '../analytics/analytics.controller';
import { CalibrationController } from '../calibration/calibration.controller';
import { CustomersController } from '../customers/customers.controller';
import { ModelsController } from '../geometry/models.controller';
import { HealthController } from '../health/health.controller';
import { MaterialsController } from '../materials/materials.controller';
import { MLController } from '../ml/ml.controller';
import { OrdersController } from '../orders/orders.controller';
import { PortalSettingsController } from '../portal/portal-settings.controller';
import { PortalController } from '../portal/portal.controller';
import { PricingController } from '../pricing/pricing.controller';
import { PrintersController } from '../printers/printers.controller';
import { PrintPreparationController } from '../quotes/print-preparation.controller';
import { QuotesController } from '../quotes/quotes.controller';
import { TenancyController } from '../tenancy/tenancy.controller';
import { AuthController } from './auth.controller';
import type { RequestAuthContext } from './auth.types';
import { CustomerBoundaryGuard, isCustomerOnly } from './customer-boundary.guard';
import { MembersController } from './members.controller';

type ControllerClass = { name: string; prototype: object };

const CONTROLLERS: ControllerClass[] = [
  AnalyticsController,
  AuthController,
  CalibrationController,
  CustomersController,
  HealthController,
  MaterialsController,
  MembersController,
  MLController,
  ModelsController,
  OrdersController,
  PortalController,
  PortalSettingsController,
  PricingController,
  PrintersController,
  PrintPreparationController,
  QuotesController,
  TenancyController,
];

/** Everything a customer token may call. Anything else must be refused. */
const CUSTOMER_ROUTES = new Set([
  'AuthController.me',
  'ModelsController.startUpload',
  'ModelsController.complete',
  'PortalController.getQuoteOptions',
  'PortalController.listQuotes',
  'PortalController.getQuote',
  'PortalController.createQuote',
  'PortalController.repriceQuote',
  'PortalController.acceptQuote',
  'PortalController.listOrders',
]);

const CUSTOMER: RequestAuthContext = {
  userId: 'u-customer',
  tenantId: 't-1',
  roles: ['customer'],
  // Customers hold models:* and roles:read; the boundary must not depend on permissions.
  permissions: ['roles:read', 'models:read', 'models:write'],
};

const STAFF: RequestAuthContext = {
  userId: 'u-staff',
  tenantId: 't-1',
  roles: ['employee'],
  permissions: [],
};

function routes(controller: ControllerClass) {
  const proto = controller.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor' && typeof proto[name] === 'function')
    .filter((name) => Reflect.getMetadata(PATH_METADATA, proto[name] as object) !== undefined)
    .map((name) => ({ name, handler: proto[name] as () => unknown }));
}

function context(
  controller: ControllerClass,
  handler: () => unknown,
  auth?: RequestAuthContext,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ auth }) }),
  } as unknown as ExecutionContext;
}

function isPublic(controller: ControllerClass, handler: () => unknown): boolean {
  return new Reflector().getAllAndOverride<boolean>('isPublic', [handler, controller]) === true;
}

describe('CustomerBoundaryGuard', () => {
  const guard = new CustomerBoundaryGuard(new Reflector());

  it('recognises customer-only principals', () => {
    expect(isCustomerOnly({ roles: ['customer'] })).toBe(true);
    expect(isCustomerOnly({ roles: ['customer', 'employee'] })).toBe(false);
    expect(isCustomerOnly({ roles: ['owner'] })).toBe(false);
    expect(isCustomerOnly({ roles: [] })).toBe(false);
  });

  const all = CONTROLLERS.flatMap((controller) =>
    routes(controller).map((route) => ({ controller, ...route })),
  );

  it('finds the routes to check', () => {
    expect(all.length).toBeGreaterThan(40);
    for (const allowed of CUSTOMER_ROUTES) {
      expect(
        all.some((r) => `${r.controller.name}.${r.name}` === allowed),
        allowed,
      ).toBe(true);
    }
  });

  it.each(all.map((r) => [`${r.controller.name}.${r.name}`, r] as const))(
    'customer token on %s',
    (key, route) => {
      const run = () => guard.canActivate(context(route.controller, route.handler, CUSTOMER));
      if (CUSTOMER_ROUTES.has(key) || isPublic(route.controller, route.handler)) {
        expect(run()).toBe(true);
      } else {
        expect(run).toThrow(ForbiddenException);
      }
    },
  );

  it('never blocks staff tokens', () => {
    for (const route of all) {
      expect(guard.canActivate(context(route.controller, route.handler, STAFF))).toBe(true);
    }
  });

  it('keeps staff cost data closed to customers (quotes, orders, pricing, portal settings)', () => {
    const staffOnly = [
      [QuotesController, QuotesController.prototype.findOne],
      [QuotesController, QuotesController.prototype.list],
      [OrdersController, OrdersController.prototype.findOne],
      [PricingController, PricingController.prototype.listRules],
      [PortalSettingsController, PortalSettingsController.prototype.update],
    ] as const;
    for (const [controller, handler] of staffOnly) {
      expect(() =>
        guard.canActivate(context(controller, handler as () => unknown, CUSTOMER)),
      ).toThrow(ForbiddenException);
    }
  });
});
