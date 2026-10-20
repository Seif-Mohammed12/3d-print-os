import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestAuthContext } from '../identity/auth.types';
import { QuoteService } from '../quotes/services/quote.service';
import { AppError } from '../shared/errors/app.error';
import {
  isExpired,
  layerHeightFor,
  MAX_PORTAL_QUANTITY,
  type PortalQuoteView,
  type PrintQuality,
  qualityOptions,
  toPortalOrder,
  toPortalQuote,
} from './domain/portal-quote';
import { type PortalPrinter, PortalRepository } from './portal.repository';

export type PortalQuoteChoices = {
  materialId: string;
  quality: PrintQuality;
  quantity: number;
};

/**
 * Errors from QuoteService that mean "the shop has not set this up", worded for staff.
 * A customer gets one plain message instead; the shop sees the cause on the quote itself.
 */
const SHOP_SETUP_ERRORS = new Set([
  'quote.pricing_rule_missing',
  'quote.printer_not_configured',
  'quote.printer_required',
  'quote.material_required',
  'quote.technology_unsupported',
  'quote.printer_retired',
]);

function unprocessable(code: string, message: string): AppError {
  return new AppError({ code, message, statusCode: 422 });
}

function conflict(code: string, message: string): AppError {
  return new AppError({ code, message, statusCode: 409 });
}

function toCustomerError(error: unknown): unknown {
  if (error instanceof AppError && SHOP_SETUP_ERRORS.has(error.code)) {
    return unprocessable(
      'portal.quote_unavailable',
      "We can't price this material online right now. Try another material or contact the shop.",
    );
  }
  return error;
}

function printerView(printer: PortalPrinter) {
  return {
    name: printer.name,
    build_volume_mm: {
      x: Number(printer.build_volume_x_mm) || null,
      y: Number(printer.build_volume_y_mm) || null,
      z: Number(printer.build_volume_z_mm) || null,
    },
  };
}

/**
 * The customer side of quoting. Portal quotes are ordinary `quotes` rows (source = 'portal')
 * priced by QuoteService's slicer pipeline, and accepting one creates an ordinary `orders`
 * row, so staff work them in the same screens as every other quote and order.
 *
 * Access: the caller must have a portal_customers row in the token's tenant. Every read and
 * write is scoped to that account's CRM customer, and responses are built from
 * customer-safe projections (see domain/portal-quote.ts).
 */
@Injectable()
export class PortalService {
  constructor(
    private readonly repo: PortalRepository,
    private readonly quotes: QuoteService,
  ) {}

  private async requireCustomer(auth: RequestAuthContext) {
    const customer = await this.repo.findPortalCustomer(auth.tenantId, auth.userId);
    if (!customer) {
      throw new ForbiddenException({
        code: 'portal.customer_required',
        message: 'Only customer accounts can use the portal',
      });
    }
    return customer;
  }

  private async requirePrinter(tenantId: string) {
    const setup = await this.repo.getQuotingSetup(tenantId);
    if (!setup.printer) {
      throw unprocessable(
        'portal.quoting_unavailable',
        'Online quoting is not available yet. Please contact the shop.',
      );
    }
    return { ...setup, printer: setup.printer };
  }

  private async requireMaterial(tenantId: string, printerId: string, materialId: string) {
    const material = await this.repo.findMaterial(tenantId, printerId, materialId);
    if (!material) {
      throw unprocessable('portal.material_unavailable', 'That material is not available');
    }
    return material;
  }

  private assertQuantity(quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PORTAL_QUANTITY) {
      throw unprocessable(
        'portal.invalid_quantity',
        `Quantity must be between 1 and ${MAX_PORTAL_QUANTITY}`,
      );
    }
  }

  async getQuoteOptions(auth: RequestAuthContext) {
    await this.requireCustomer(auth);
    const setup = await this.repo.getQuotingSetup(auth.tenantId);
    if (!setup.printer) {
      return {
        available: false,
        printer: null,
        materials: [],
        qualities: [],
        max_quantity: MAX_PORTAL_QUANTITY,
        currency: setup.currency,
      };
    }
    const materials = await this.repo.listMaterials(auth.tenantId, setup.printer.id);
    return {
      available: materials.length > 0,
      printer: printerView(setup.printer),
      materials: materials.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.material_type,
        color: m.color,
        color_code: m.color_code,
      })),
      qualities: qualityOptions(setup.printer.nozzle_diameter_mm),
      max_quantity: MAX_PORTAL_QUANTITY,
      currency: setup.currency,
    };
  }

  /** Create a portal quote for an uploaded model and price it with the slicer. */
  async createQuote(
    auth: RequestAuthContext,
    input: PortalQuoteChoices & { modelFileId: string; notes?: string },
  ): Promise<PortalQuoteView> {
    await this.requireCustomer(auth);
    this.assertQuantity(input.quantity);
    const setup = await this.requirePrinter(auth.tenantId);
    const model = await this.repo.findOwnModel(auth.tenantId, auth.userId, input.modelFileId);
    if (!model) {
      throw new NotFoundException({ code: 'portal.model_not_found', message: 'Model not found' });
    }
    if (model.status !== 'uploaded') {
      throw unprocessable('portal.model_not_uploaded', 'The model upload has not finished');
    }
    await this.requireMaterial(auth.tenantId, setup.printer.id, input.materialId);

    const crmCustomerId = await this.repo.ensureCrmCustomer(
      auth.tenantId,
      auth.userId,
      setup.printer.shop_id,
    );
    if (!crmCustomerId) {
      throw new ForbiddenException({
        code: 'portal.customer_required',
        message: 'Only customer accounts can use the portal',
      });
    }

    const quote = await this.quotes.create({
      tenantId: auth.tenantId,
      shop_id: setup.printer.shop_id,
      customer_id: crmCustomerId,
      model_id: model.id,
      material_id: input.materialId,
      printer_id: setup.printer.id,
      technology: 'FDM',
      layer_height_mm: layerHeightFor(input.quality, setup.printer.nozzle_diameter_mm),
      print_quality: input.quality,
      quantity: input.quantity,
      source: 'portal',
      customer_notes: input.notes?.trim() || null,
      created_by: auth.userId,
    });

    try {
      await this.priceAndOffer(auth, quote.id, setup.quoteValidityHours, {
        quantity: input.quantity,
      });
    } catch (error) {
      // Don't leave an unpriced draft behind for every failed attempt.
      await this.quotes.delete(quote.id, auth.tenantId).catch(() => undefined);
      throw toCustomerError(error);
    }
    return this.getQuote(auth, quote.id, crmCustomerId);
  }

  /** Change material, quality or quantity on a quote the customer has not ordered yet. */
  async repriceQuote(
    auth: RequestAuthContext,
    quoteId: string,
    input: PortalQuoteChoices,
  ): Promise<PortalQuoteView> {
    const customer = await this.requireCustomer(auth);
    this.assertQuantity(input.quantity);
    const row = customer.crmCustomerId
      ? await this.repo.findQuote(auth.tenantId, customer.crmCustomerId, quoteId)
      : null;
    if (!row || !customer.crmCustomerId) {
      throw new NotFoundException({ code: 'portal.quote_not_found', message: 'Quote not found' });
    }
    if (row.status !== 'draft' && row.status !== 'pending') {
      throw conflict('portal.quote_closed', 'This quote has already been ordered or closed');
    }

    const setup = await this.requirePrinter(auth.tenantId);
    await this.requireMaterial(auth.tenantId, setup.printer.id, input.materialId);
    const layerHeight = layerHeightFor(input.quality, setup.printer.nozzle_diameter_mm);
    const quote = await this.quotes.findById(quoteId, auth.tenantId);
    const sliceInputsChanged =
      quote.material_id !== input.materialId ||
      quote.printer_id !== setup.printer.id ||
      Number(quote.layer_height_mm) !== layerHeight;

    try {
      if (sliceInputsChanged) {
        // QuoteService.update clears the stored price when slicing inputs change.
        await this.quotes.update(
          quoteId,
          {
            material_id: input.materialId,
            printer_id: setup.printer.id,
            layer_height_mm: layerHeight,
            print_quality: input.quality,
          },
          auth.tenantId,
          auth.userId,
        );
      }
      await this.priceAndOffer(auth, quoteId, setup.quoteValidityHours, {
        quantity: input.quantity,
        // Quantity alone doesn't change the toolpath: reprice from the stored slice.
        reuseSlice: !sliceInputsChanged,
      });
    } catch (error) {
      // A failed reprice leaves no valid price; make sure it can't be ordered.
      await this.quotes
        .update(quoteId, { status: 'draft', estimate_source: null }, auth.tenantId, auth.userId)
        .catch(() => undefined);
      throw toCustomerError(error);
    }
    return this.getQuote(auth, quoteId, customer.crmCustomerId);
  }

  private async priceAndOffer(
    auth: RequestAuthContext,
    quoteId: string,
    validityHours: number,
    options: { quantity: number; reuseSlice?: boolean },
  ) {
    await this.quotes.analyzeQuote(quoteId, auth.tenantId, auth.userId, options);
    await this.quotes.update(
      quoteId,
      { status: 'pending', expires_at: new Date(Date.now() + validityHours * 3_600_000) },
      auth.tenantId,
      auth.userId,
    );
  }

  /** Accept a priced quote: the shop gets an order at exactly the price the customer saw. */
  async acceptQuote(
    auth: RequestAuthContext,
    quoteId: string,
    expectedTotalCents: number,
    notes?: string,
  ) {
    const customer = await this.requireCustomer(auth);
    const crmCustomerId = customer.crmCustomerId;
    const row = crmCustomerId
      ? await this.repo.findQuote(auth.tenantId, crmCustomerId, quoteId)
      : null;
    if (!row || !crmCustomerId) {
      throw new NotFoundException({ code: 'portal.quote_not_found', message: 'Quote not found' });
    }
    if (row.order_id) {
      // Already accepted (e.g. a double click): return the existing order.
      return this.getQuote(auth, quoteId, crmCustomerId);
    }

    const claimed = await this.repo.claimForOrder(
      auth.tenantId,
      crmCustomerId,
      quoteId,
      expectedTotalCents,
      auth.userId,
    );
    if (!claimed) {
      const current = await this.repo.findQuote(auth.tenantId, crmCustomerId, quoteId);
      if (current?.order_id) {
        return this.getQuote(auth, quoteId, crmCustomerId);
      }
      if (!current || current.status !== 'pending' || current.estimate_source !== 'slicer') {
        throw conflict('portal.quote_not_priced', 'This quote has no price to accept');
      }
      if (isExpired(current.expires_at)) {
        throw conflict('portal.quote_expired', 'This price has expired. Refresh it to order.');
      }
      throw conflict(
        'portal.price_changed',
        'The price changed while you were deciding. Check the new price and order again.',
      );
    }

    if (notes?.trim()) {
      // Before converting, so the order carries them as its customer notes.
      await this.quotes.update(
        quoteId,
        { customer_notes: notes.trim() },
        auth.tenantId,
        auth.userId,
      );
    }
    await this.quotes.convertToOrder(quoteId, auth.tenantId, auth.userId);
    return this.getQuote(auth, quoteId, crmCustomerId);
  }

  private async getQuote(auth: RequestAuthContext, quoteId: string, crmCustomerId: string) {
    const row = await this.repo.findQuote(auth.tenantId, crmCustomerId, quoteId);
    if (!row) {
      throw new NotFoundException({ code: 'portal.quote_not_found', message: 'Quote not found' });
    }
    return toPortalQuote(row);
  }

  async listQuotes(auth: RequestAuthContext) {
    const customer = await this.requireCustomer(auth);
    if (!customer.crmCustomerId) {
      return [];
    }
    const rows = await this.repo.listQuotes(auth.tenantId, customer.crmCustomerId);
    return rows.map((row) => toPortalQuote(row));
  }

  async findQuote(auth: RequestAuthContext, quoteId: string) {
    const customer = await this.requireCustomer(auth);
    if (!customer.crmCustomerId) {
      throw new NotFoundException({ code: 'portal.quote_not_found', message: 'Quote not found' });
    }
    return this.getQuote(auth, quoteId, customer.crmCustomerId);
  }

  async listOrders(auth: RequestAuthContext) {
    const customer = await this.requireCustomer(auth);
    if (!customer.crmCustomerId) {
      return [];
    }
    const rows = await this.repo.listOrders(auth.tenantId, customer.crmCustomerId);
    return rows.map(toPortalOrder);
  }

  // -------------------------------------------------------------------------
  // Shop side: which printer portal quotes are priced on
  // -------------------------------------------------------------------------

  async getSettings(tenantId: string) {
    const setup = await this.repo.getQuotingSetup(tenantId);
    return {
      portal_printer_id: setup.configuredPrinterId,
      effective_printer: setup.printer ? { id: setup.printer.id, name: setup.printer.name } : null,
    };
  }

  async updateSettings(tenantId: string, printerId: string | null) {
    if (printerId && !(await this.repo.findQuotablePrinter(tenantId, printerId))) {
      throw unprocessable(
        'portal.printer_not_quotable',
        'Choose an active FDM printer for portal quotes',
      );
    }
    await this.repo.setPortalPrinter(tenantId, printerId);
    return this.getSettings(tenantId);
  }
}
