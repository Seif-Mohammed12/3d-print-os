import { NotFoundException } from '@nestjs/common';

import type { ModelUploadService } from '@3d-print-os/geometry';

import { QuoteService } from '../quotes/services/quote.service';
import { AppError } from '../shared/errors/app.error';
import {
  isExpired,
  layerHeightFor,
  MAX_PORTAL_QUANTITY,
  type PortalQuoteView,
  type PrintQuality,
  qualityOptions,
  toPortalQuote,
} from '../portal/domain/portal-quote';
import { type PortalPrinter, PortalRepository } from '../portal/portal.repository';
import { toCustomerError } from '../portal/portal.service';
import {
  EMBED_SESSION_TTL_HOURS,
  hashSessionToken,
  isOriginAllowed,
  isPublishableKey,
  MAX_QUOTES_PER_SESSION,
  MAX_UPLOADS_PER_SESSION,
  newSessionToken,
  normalizeOrigin,
  sanitizeTheme,
} from './domain/embed-rules';
import type {
  EmbedRepository,
  EmbedSession,
  EmbedSettingsRow,
  EmbedShop,
} from './embed.repository';

export type EmbedQuoteChoices = {
  printerId: string;
  materialId: string;
  quality: PrintQuality;
  quantity: number;
};

export type EmbedContact = { name: string; email?: string; phone?: string; notes?: string };

function unprocessable(code: string, message: string): AppError {
  return new AppError({ code, message, statusCode: 422 });
}

function conflict(code: string, message: string): AppError {
  return new AppError({ code, message, statusCode: 409 });
}

/** Same answer for an unknown key, a disabled embed and a closed shop: nothing to probe. */
function shopUnavailable(): AppError {
  return new AppError({
    code: 'embed.unavailable',
    message: 'Online quoting is not available for this shop.',
    statusCode: 404,
  });
}

function originRefused(): AppError {
  return new AppError({
    code: 'embed.origin_not_allowed',
    message: 'This website is not allowed to use this shop’s quoter.',
    statusCode: 403,
  });
}

function quoteNotFound(): NotFoundException {
  return new NotFoundException({ code: 'embed.quote_not_found', message: 'Quote not found' });
}

function printerView(printer: PortalPrinter) {
  return {
    id: printer.id,
    name: printer.name,
    build_volume_mm: {
      x: Number(printer.build_volume_x_mm) || null,
      y: Number(printer.build_volume_y_mm) || null,
      z: Number(printer.build_volume_z_mm) || null,
    },
    qualities: qualityOptions(printer.nozzle_diameter_mm),
  };
}

/**
 * The website quoter: anonymous visitors on a shop's own site upload a model, get a slicer
 * price and order. Embed quotes are ordinary `quotes` rows (source = 'embed') priced by
 * QuoteService, and ordering creates an ordinary `orders` row, so staff see them with every
 * other quote and order.
 *
 * Access: a publishable key names the shop; the caller's Origin must be on the shop's
 * allowed list (or be the quoter frame itself, which then vouches for the host page); and
 * everything after that is scoped to the visitor session it started. Responses reuse the
 * portal's customer-safe projections, so no cost lines or internal notes can leak.
 */
export class EmbedService {
  constructor(
    private readonly repo: EmbedRepository,
    private readonly portalRepo: PortalRepository,
    private readonly quotes: QuoteService,
    private readonly uploads: ModelUploadService,
    private readonly options: {
      /** Origins the quoter frame is served from (the web app). */
      frameOrigins: string[];
      uploadMaxBytes: number;
    },
  ) {}

  // -------------------------------------------------------------------------
  // Origin checks
  // -------------------------------------------------------------------------

  private isFrameOrigin(origin: string | undefined): boolean {
    return isOriginAllowed(origin, this.options.frameOrigins);
  }

  /**
   * A browser always sends Origin on these requests and scripts can't change it. Calls from
   * the quoter frame are trusted to have checked their host page; calls straight from a
   * host page must come from one of the shop's own origins. Requests without Origin (curl,
   * servers) are allowed, as with any publishable key: rate limits bound them.
   */
  private assertCaller(origin: string | undefined, allowed: string[]) {
    if (origin === undefined || this.isFrameOrigin(origin) || isOriginAllowed(origin, allowed)) {
      return;
    }
    throw originRefused();
  }

  private async requireShop(key: string, origin: string | undefined): Promise<EmbedShop> {
    if (!isPublishableKey(key)) {
      throw shopUnavailable();
    }
    const shop = await this.repo.findShopByKey(key);
    if (!shop || !shop.is_enabled) {
      throw shopUnavailable();
    }
    this.assertCaller(origin, shop.allowed_origins);
    return shop;
  }

  // -------------------------------------------------------------------------
  // Visitor side
  // -------------------------------------------------------------------------

  /** What the quoter needs to render: shop name, look, printers and their materials. */
  async getConfig(key: string, origin: string | undefined) {
    const shop = await this.requireShop(key, origin);
    const printers = await this.repo.listPrinters(shop.tenant_id, shop.printer_ids);
    const withMaterials = await Promise.all(
      printers.map(async (printer) => ({
        ...printerView(printer),
        materials: (await this.portalRepo.listMaterials(shop.tenant_id, printer.id)).map((m) => ({
          id: m.id,
          name: m.name,
          type: m.material_type,
          color: m.color,
          color_code: m.color_code,
        })),
      })),
    );
    const usable = withMaterials.filter((printer) => printer.materials.length > 0);
    return {
      shop_name: shop.shop_name,
      available: usable.length > 0,
      printers: usable,
      max_quantity: MAX_PORTAL_QUANTITY,
      currency: shop.currency,
      upload_max_bytes: this.options.uploadMaxBytes,
      theme: sanitizeTheme(shop.theme_json),
    };
  }

  /**
   * Start a visitor session. The host page must be one of the shop's allowed origins: the
   * frame reports it (from location.ancestorOrigins / document.referrer, which the host page
   * can't forge), and a direct call is judged by its own Origin header.
   */
  async startSession(key: string, origin: string | undefined, parentOrigin: string) {
    const shop = await this.requireShop(key, origin);
    const host = this.isFrameOrigin(origin) ? parentOrigin : (origin ?? parentOrigin);
    const normalized = normalizeOrigin(host);
    if (!normalized || !isOriginAllowed(normalized, shop.allowed_origins)) {
      throw originRefused();
    }
    const token = newSessionToken();
    const expiresAt = new Date(Date.now() + EMBED_SESSION_TTL_HOURS * 3_600_000);
    await this.repo.createSession(shop.tenant_id, hashSessionToken(token), normalized, expiresAt);
    return { token, expires_at: expiresAt.toISOString() };
  }

  /** The session behind a token, checked against the caller's Origin. */
  async resolveSession(token: string, origin: string | undefined): Promise<EmbedSession | null> {
    if (!/^es_[A-Za-z0-9_-]{40,60}$/.test(token)) {
      return null;
    }
    const session = await this.repo.findLiveSession(hashSessionToken(token));
    if (!session) {
      return null;
    }
    this.assertCaller(origin, [session.origin]);
    return session;
  }

  async startUpload(session: EmbedSession, input: { filename: string; byteSize: number }) {
    if (input.byteSize > this.options.uploadMaxBytes) {
      throw unprocessable(
        'embed.file_too_large',
        `Files can be up to ${Math.floor(this.options.uploadMaxBytes / 1_048_576)} MB.`,
      );
    }
    await this.requireSessionShop(session);
    if (
      !(await this.repo.claimUploadSlot(session.tenant_id, session.id, MAX_UPLOADS_PER_SESSION))
    ) {
      throw new AppError({
        code: 'embed.upload_limit',
        message: 'Upload limit reached. Reload the page to start over.',
        statusCode: 429,
      });
    }
    const result = await this.uploads.startUpload({
      tenantId: session.tenant_id,
      userId: null,
      embedSessionId: session.id,
      originalFilename: input.filename,
      byteSize: input.byteSize,
      contentType: 'model/stl',
    });
    return {
      model: { id: result.model.id, filename: result.model.originalFilename },
      upload: {
        method: result.upload.method,
        url: result.upload.url,
        headers: result.upload.headers,
        expires_in: result.upload.expiresInSeconds,
      },
    };
  }

  async completeUpload(session: EmbedSession, modelId: string, checksumSha256?: string) {
    const model = await this.repo.findSessionModel(session.tenant_id, session.id, modelId);
    if (!model) {
      throw new NotFoundException({ code: 'embed.model_not_found', message: 'Model not found' });
    }
    const done = await this.uploads.completeUpload(session.tenant_id, modelId, checksumSha256);
    return { id: done.id, filename: done.originalFilename, status: done.status };
  }

  /** Create a quote for an uploaded model and price it with the slicer. */
  async createQuote(
    session: EmbedSession,
    input: EmbedQuoteChoices & { modelFileId: string },
  ): Promise<PortalQuoteView> {
    const shop = await this.requireSessionShop(session);
    if (
      (await this.repo.countSessionQuotes(session.tenant_id, session.id)) >= MAX_QUOTES_PER_SESSION
    ) {
      throw new AppError({
        code: 'embed.quote_limit',
        message: 'Quote limit reached. Reload the page to start over.',
        statusCode: 429,
      });
    }
    const model = await this.repo.findSessionModel(
      session.tenant_id,
      session.id,
      input.modelFileId,
    );
    if (!model) {
      throw new NotFoundException({ code: 'embed.model_not_found', message: 'Model not found' });
    }
    if (model.status !== 'uploaded') {
      throw unprocessable('embed.model_not_uploaded', 'The model upload has not finished');
    }
    const printer = await this.requireChoices(shop, input);
    const guestCustomerId = await this.repo.ensureGuestCustomer(session.tenant_id, printer.shop_id);

    const quote = await this.quotes.create({
      tenantId: session.tenant_id,
      shop_id: printer.shop_id,
      customer_id: guestCustomerId,
      model_id: model.id,
      material_id: input.materialId,
      printer_id: printer.id,
      technology: 'FDM',
      layer_height_mm: layerHeightFor(input.quality, printer.nozzle_diameter_mm),
      print_quality: input.quality,
      quantity: input.quantity,
      source: 'embed',
      customer_notes: null,
      created_by: null,
    });
    await this.repo.setQuoteSession(session.tenant_id, quote.id, session.id);

    try {
      await this.priceAndOffer(session.tenant_id, quote.id, shop.quote_validity_hours, {
        quantity: input.quantity,
      });
    } catch (error) {
      // Don't leave an unpriced draft behind for every failed attempt.
      await this.quotes.delete(quote.id, session.tenant_id).catch(() => undefined);
      throw toCustomerError(error);
    }
    return this.getQuote(session, quote.id);
  }

  /** Change printer, material, quality or quantity and get the new price. */
  async repriceQuote(
    session: EmbedSession,
    quoteId: string,
    input: EmbedQuoteChoices,
  ): Promise<PortalQuoteView> {
    const shop = await this.requireSessionShop(session);
    const row = await this.repo.findQuote(session.tenant_id, session.id, quoteId);
    if (!row) {
      throw quoteNotFound();
    }
    if (row.status !== 'draft' && row.status !== 'pending') {
      throw conflict('embed.quote_closed', 'This quote has already been ordered or closed');
    }
    const printer = await this.requireChoices(shop, input);
    const layerHeight = layerHeightFor(input.quality, printer.nozzle_diameter_mm);
    const quote = await this.quotes.findById(quoteId, session.tenant_id);
    const sliceInputsChanged =
      quote.material_id !== input.materialId ||
      quote.printer_id !== printer.id ||
      Number(quote.layer_height_mm) !== layerHeight;

    try {
      if (sliceInputsChanged) {
        // QuoteService.update clears the stored price when slicing inputs change.
        await this.quotes.update(
          quoteId,
          {
            material_id: input.materialId,
            printer_id: printer.id,
            layer_height_mm: layerHeight,
            print_quality: input.quality,
          },
          session.tenant_id,
          null,
        );
      }
      await this.priceAndOffer(session.tenant_id, quoteId, shop.quote_validity_hours, {
        quantity: input.quantity,
        // Quantity alone doesn't change the toolpath: reprice from the stored slice.
        reuseSlice: !sliceInputsChanged,
      });
    } catch (error) {
      // A failed reprice leaves no valid price; make sure it can't be ordered.
      await this.quotes
        .update(quoteId, { status: 'draft', estimate_source: null }, session.tenant_id, null)
        .catch(() => undefined);
      throw toCustomerError(error);
    }
    return this.getQuote(session, quoteId);
  }

  /** Order at the price the visitor saw; creates their customer record and the order. */
  async placeOrder(
    session: EmbedSession,
    quoteId: string,
    expectedTotalCents: number,
    contact: EmbedContact,
  ): Promise<PortalQuoteView> {
    await this.requireSessionShop(session);
    const row = await this.repo.findQuote(session.tenant_id, session.id, quoteId);
    if (!row) {
      throw quoteNotFound();
    }
    if (row.order_id) {
      // Already ordered (e.g. a double click): return the existing order.
      return toPortalQuote(row);
    }
    const quote = await this.quotes.findById(quoteId, session.tenant_id);

    const claimed = await this.repo.claimForOrder({
      tenantId: session.tenant_id,
      sessionId: session.id,
      quoteId,
      shopId: quote.shop_id,
      expectedTotalCents,
      contact: {
        name: contact.name.trim(),
        email: contact.email?.trim().toLowerCase() || null,
        phone: contact.phone?.trim() || null,
      },
      notes: contact.notes?.trim() || null,
    });
    if (!claimed) {
      const current = await this.repo.findQuote(session.tenant_id, session.id, quoteId);
      if (current?.order_id) {
        return toPortalQuote(current);
      }
      if (!current || current.status !== 'pending' || current.estimate_source !== 'slicer') {
        throw conflict('embed.quote_not_priced', 'This quote has no price to accept');
      }
      if (isExpired(current.expires_at)) {
        throw conflict('embed.quote_expired', 'This price has expired. Refresh it to order.');
      }
      throw conflict(
        'embed.price_changed',
        'The price changed while you were deciding. Check the new price and order again.',
      );
    }
    await this.quotes.convertToOrder(quoteId, session.tenant_id, null);
    return this.getQuote(session, quoteId);
  }

  private async requireSessionShop(session: EmbedSession): Promise<EmbedShop> {
    const shop = await this.repo.findShopByTenant(session.tenant_id);
    if (!shop || !shop.is_enabled) {
      throw shopUnavailable();
    }
    return shop;
  }

  private async requireChoices(shop: EmbedShop, input: EmbedQuoteChoices) {
    if (
      !Number.isInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > MAX_PORTAL_QUANTITY
    ) {
      throw unprocessable(
        'embed.invalid_quantity',
        `Quantity must be between 1 and ${MAX_PORTAL_QUANTITY}`,
      );
    }
    const printers = await this.repo.listPrinters(shop.tenant_id, shop.printer_ids);
    const printer = printers.find((p) => p.id === input.printerId);
    if (!printer) {
      throw unprocessable('embed.printer_unavailable', 'That printer is not available');
    }
    const material = await this.portalRepo.findMaterial(
      shop.tenant_id,
      printer.id,
      input.materialId,
    );
    if (!material) {
      throw unprocessable('embed.material_unavailable', 'That material is not available');
    }
    return printer;
  }

  private async priceAndOffer(
    tenantId: string,
    quoteId: string,
    validityHours: number,
    options: { quantity: number; reuseSlice?: boolean },
  ) {
    await this.quotes.analyzeQuote(quoteId, tenantId, null, options);
    await this.quotes.update(
      quoteId,
      { status: 'pending', expires_at: new Date(Date.now() + validityHours * 3_600_000) },
      tenantId,
      null,
    );
  }

  private async getQuote(session: EmbedSession, quoteId: string) {
    const row = await this.repo.findQuote(session.tenant_id, session.id, quoteId);
    if (!row) {
      throw quoteNotFound();
    }
    return toPortalQuote(row);
  }

  // -------------------------------------------------------------------------
  // Staff side
  // -------------------------------------------------------------------------

  private settingsView(row: EmbedSettingsRow) {
    return {
      publishable_key: row.publishable_key,
      is_enabled: row.is_enabled,
      allowed_origins: row.allowed_origins,
      printer_ids: row.printer_ids,
      theme: sanitizeTheme(row.theme_json),
      updated_at: row.updated_at.toISOString(),
    };
  }

  async getSettings(tenantId: string) {
    return this.settingsView(await this.repo.ensureSettings(tenantId));
  }

  async updateSettings(
    tenantId: string,
    input: {
      isEnabled?: boolean;
      allowedOrigins?: string[];
      printerIds?: string[] | null;
      theme?: Record<string, unknown>;
    },
  ) {
    await this.repo.ensureSettings(tenantId);
    let allowedOrigins: string[] | undefined;
    if (input.allowedOrigins) {
      allowedOrigins = [];
      for (const value of input.allowedOrigins) {
        const origin = normalizeOrigin(value);
        if (!origin) {
          throw new AppError({
            code: 'embed.invalid_origin',
            message: `"${value}" is not a website address. Use the form https://www.example.com.`,
            statusCode: 422,
          });
        }
        if (!allowedOrigins.includes(origin)) {
          allowedOrigins.push(origin);
        }
      }
    }
    if (input.printerIds) {
      const quotable = await this.repo.listPrinters(tenantId, null);
      const unknown = input.printerIds.filter((id) => !quotable.some((p) => p.id === id));
      if (unknown.length > 0) {
        throw unprocessable('embed.printer_not_quotable', 'Choose active FDM printers only');
      }
    }
    await this.repo.updateSettings(tenantId, {
      ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
      ...(allowedOrigins ? { allowedOrigins } : {}),
      ...(input.printerIds !== undefined
        ? { printerIds: input.printerIds && input.printerIds.length > 0 ? input.printerIds : null }
        : {}),
      ...(input.theme ? { theme: sanitizeTheme(input.theme) } : {}),
    });
    return this.getSettings(tenantId);
  }

  async rotateKey(tenantId: string) {
    await this.repo.ensureSettings(tenantId);
    await this.repo.rotateKey(tenantId);
    return this.getSettings(tenantId);
  }
}
