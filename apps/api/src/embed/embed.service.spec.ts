import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ModelUploadService } from '@3d-print-os/geometry';

import type { PortalQuoteRow } from '../portal/domain/portal-quote';
import type { PortalRepository } from '../portal/portal.repository';
import type { QuoteService } from '../quotes/services/quote.service';
import { AppError } from '../shared/errors/app.error';
import { hashSessionToken } from './domain/embed-rules';
import type { EmbedRepository, EmbedSession, EmbedShop } from './embed.repository';
import { EmbedService } from './embed.service';

const KEY = 'pk_abcdefghijklmnopqrstuvwx';
const FRAME = 'https://app.printos.example';
const HOST = 'https://www.3dprintit.example';
const TENANT = 't-1';

const SHOP: EmbedShop = {
  tenant_id: TENANT,
  publishable_key: KEY,
  is_enabled: true,
  allowed_origins: [HOST],
  printer_ids: null,
  theme_json: { accent: '#ff5500', font_family: 'x}body{' },
  guest_customer_id: null,
  updated_at: new Date('2026-11-01T00:00:00Z'),
  shop_name: 'Any Shop',
  currency: 'EGP',
  quote_validity_hours: 72,
};

const PRINTER = {
  id: '11111111-1111-4111-8111-111111111111',
  shop_id: 'shop-1',
  name: 'Prusa MK4',
  nozzle_diameter_mm: '0.40',
  build_volume_x_mm: '250',
  build_volume_y_mm: '210',
  build_volume_z_mm: '220',
};
const PLA = {
  id: 'mat-pla',
  name: 'PLA',
  material_type: 'PLA',
  color: 'Black',
  color_code: '#000',
};

const SESSION: EmbedSession = {
  id: 'sess-1',
  tenant_id: TENANT,
  origin: HOST,
  upload_count: 0,
  expires_at: new Date(Date.now() + 3_600_000),
};

function quoteRow(overrides: Partial<PortalQuoteRow> = {}): PortalQuoteRow {
  return {
    id: 'q-1',
    quote_number: 'Q-1',
    status: 'pending',
    estimate_source: 'slicer',
    total_cents: 12_300,
    currency: 'EGP',
    quantity: 1,
    print_quality: 'standard',
    estimated_time_minutes: 90,
    estimated_weight_grams: 40,
    bounding_box_x_mm: 10,
    bounding_box_y_mm: 10,
    bounding_box_z_mm: 10,
    customer_notes: null,
    expires_at: new Date(Date.now() + 3_600_000),
    created_at: new Date(),
    model_filename: 'part.stl',
    material_id: PLA.id,
    material_name: PLA.name,
    material_type: PLA.material_type,
    material_color: PLA.color,
    material_color_code: PLA.color_code,
    order_id: null,
    order_number: null,
    ...overrides,
  };
}

describe('EmbedService', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let portalRepo: Record<string, ReturnType<typeof vi.fn>>;
  let quotes: Record<string, ReturnType<typeof vi.fn>>;
  let uploads: Record<string, ReturnType<typeof vi.fn>>;
  let service: EmbedService;

  beforeEach(() => {
    repo = {
      findShopByKey: vi.fn().mockResolvedValue(SHOP),
      findShopByTenant: vi.fn().mockResolvedValue(SHOP),
      listPrinters: vi.fn().mockResolvedValue([PRINTER]),
      createSession: vi.fn().mockResolvedValue(SESSION),
      findLiveSession: vi.fn().mockResolvedValue(SESSION),
      claimUploadSlot: vi.fn().mockResolvedValue(true),
      countSessionQuotes: vi.fn().mockResolvedValue(0),
      findSessionModel: vi.fn().mockResolvedValue({ id: 'm-1', status: 'uploaded' }),
      findQuote: vi.fn().mockResolvedValue(quoteRow()),
      setQuoteSession: vi.fn(),
      ensureGuestCustomer: vi.fn().mockResolvedValue('cust-guest'),
      claimForOrder: vi.fn().mockResolvedValue(true),
    };
    portalRepo = {
      listMaterials: vi.fn().mockResolvedValue([PLA]),
      findMaterial: vi.fn().mockResolvedValue(PLA),
    };
    quotes = {
      create: vi.fn().mockResolvedValue({ id: 'q-1' }),
      analyzeQuote: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue({
        id: 'q-1',
        shop_id: 'shop-1',
        material_id: PLA.id,
        printer_id: PRINTER.id,
        layer_height_mm: '0.20',
      }),
      convertToOrder: vi.fn(),
    };
    uploads = {
      startUpload: vi.fn().mockResolvedValue({
        model: { id: 'm-1', originalFilename: 'part.stl' },
        upload: { method: 'PUT', url: 'https://storage/x', headers: {}, expiresInSeconds: 600 },
      }),
      completeUpload: vi.fn(),
    };
    service = new EmbedService(
      repo as unknown as EmbedRepository,
      portalRepo as unknown as PortalRepository,
      quotes as unknown as QuoteService,
      uploads as unknown as ModelUploadService,
      { frameOrigins: [FRAME], uploadMaxBytes: 1_000_000 },
    );
  });

  describe('getConfig', () => {
    it('returns printers with materials and only a safe theme', async () => {
      const config = await service.getConfig(KEY, FRAME);
      expect(config.available).toBe(true);
      expect(config.printers[0]).toMatchObject({ id: PRINTER.id, name: 'Prusa MK4' });
      expect(config.printers[0]!.materials).toHaveLength(1);
      expect(config.theme).toEqual({ accent: '#ff5500' });
      expect(JSON.stringify(config)).not.toMatch(/guest_customer|allowed_origins|cost/);
    });

    it('answers the same for unknown, malformed and disabled keys', async () => {
      repo.findShopByKey!.mockResolvedValueOnce(null);
      await expect(service.getConfig(KEY, FRAME)).rejects.toMatchObject({
        code: 'embed.unavailable',
      });
      await expect(service.getConfig("'; drop", FRAME)).rejects.toMatchObject({
        code: 'embed.unavailable',
      });
      repo.findShopByKey!.mockResolvedValueOnce({ ...SHOP, is_enabled: false });
      await expect(service.getConfig(KEY, FRAME)).rejects.toMatchObject({
        code: 'embed.unavailable',
      });
    });

    it('refuses a browser on a website the shop has not allowed', async () => {
      await expect(service.getConfig(KEY, 'https://copycat.example')).rejects.toMatchObject({
        code: 'embed.origin_not_allowed',
      });
      await expect(service.getConfig(KEY, HOST)).resolves.toBeTruthy();
    });
  });

  describe('startSession', () => {
    it('starts a session when the frame vouches for an allowed host page', async () => {
      const result = await service.startSession(KEY, FRAME, `${HOST}/quote`);
      expect(result.token).toMatch(/^es_/);
      const [, tokenHash, origin] = repo.createSession!.mock.calls[0]!;
      expect(tokenHash).toBe(hashSessionToken(result.token));
      expect(origin).toBe(HOST);
    });

    it('refuses a host page that is not allowed', async () => {
      await expect(
        service.startSession(KEY, FRAME, 'https://copycat.example'),
      ).rejects.toBeInstanceOf(AppError);
      expect(repo.createSession).not.toHaveBeenCalled();
    });

    it('judges a direct call by its own Origin, not the claimed parent', async () => {
      await expect(
        service.startSession(KEY, 'https://copycat.example', HOST),
      ).rejects.toMatchObject({ code: 'embed.origin_not_allowed' });
    });
  });

  describe('resolveSession', () => {
    it('ignores malformed tokens without a lookup', async () => {
      expect(await service.resolveSession('Bearer x', FRAME)).toBeNull();
      expect(repo.findLiveSession).not.toHaveBeenCalled();
    });

    it('refuses a session used from another website', async () => {
      const token = `es_${'a'.repeat(43)}`;
      await expect(service.resolveSession(token, 'https://copycat.example')).rejects.toMatchObject({
        code: 'embed.origin_not_allowed',
      });
      expect(await service.resolveSession(token, FRAME)).toBe(SESSION);
    });
  });

  describe('uploads', () => {
    it('owns the upload by the session, not a user', async () => {
      await service.startUpload(SESSION, { filename: 'part.stl', byteSize: 1000 });
      expect(uploads.startUpload).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null, embedSessionId: 'sess-1', tenantId: TENANT }),
      );
    });

    it('enforces the size limit and the per-session cap', async () => {
      await expect(
        service.startUpload(SESSION, { filename: 'big.stl', byteSize: 2_000_000 }),
      ).rejects.toMatchObject({ code: 'embed.file_too_large' });
      repo.claimUploadSlot!.mockResolvedValueOnce(false);
      await expect(
        service.startUpload(SESSION, { filename: 'part.stl', byteSize: 1000 }),
      ).rejects.toMatchObject({ code: 'embed.upload_limit' });
    });

    it("won't complete another session's model", async () => {
      repo.findSessionModel!.mockResolvedValueOnce(null);
      await expect(service.completeUpload(SESSION, 'm-other')).rejects.toMatchObject({
        status: 404,
      });
      expect(uploads.completeUpload).not.toHaveBeenCalled();
    });
  });

  describe('quotes', () => {
    const choices = {
      printerId: PRINTER.id,
      materialId: PLA.id,
      quality: 'standard' as const,
      quantity: 2,
    };

    it('creates an embed quote under the guest customer and prices it', async () => {
      const quote = await service.createQuote(SESSION, { ...choices, modelFileId: 'm-1' });
      expect(quotes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'embed',
          customer_id: 'cust-guest',
          printer_id: PRINTER.id,
          created_by: null,
          quantity: 2,
        }),
      );
      expect(repo.setQuoteSession).toHaveBeenCalledWith(TENANT, 'q-1', 'sess-1');
      expect(quotes.analyzeQuote).toHaveBeenCalledWith('q-1', TENANT, null, { quantity: 2 });
      expect(quote.total_cents).toBe(12_300);
      expect(quote).not.toHaveProperty('pricing_breakdown');
    });

    it('refuses a printer the shop did not offer', async () => {
      await expect(
        service.createQuote(SESSION, { ...choices, printerId: 'other', modelFileId: 'm-1' }),
      ).rejects.toMatchObject({ code: 'embed.printer_unavailable' });
      expect(quotes.create).not.toHaveBeenCalled();
    });

    it('deletes the draft and hides setup errors when pricing fails', async () => {
      quotes.analyzeQuote!.mockRejectedValueOnce(
        new AppError({
          code: 'quote.pricing_rule_missing',
          message: 'staff detail',
          statusCode: 422,
        }),
      );
      await expect(
        service.createQuote(SESSION, { ...choices, modelFileId: 'm-1' }),
      ).rejects.toMatchObject({ code: 'portal.quote_unavailable' });
      expect(quotes.delete).toHaveBeenCalledWith('q-1', TENANT);
    });

    it('caps quotes per session', async () => {
      repo.countSessionQuotes!.mockResolvedValueOnce(40);
      await expect(
        service.createQuote(SESSION, { ...choices, modelFileId: 'm-1' }),
      ).rejects.toMatchObject({ code: 'embed.quote_limit' });
    });

    it('reprices from the stored slice when only the quantity changes', async () => {
      await service.repriceQuote(SESSION, 'q-1', { ...choices, quantity: 5 });
      expect(quotes.update).not.toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ material_id: PLA.id }),
        TENANT,
        null,
      );
      expect(quotes.analyzeQuote).toHaveBeenCalledWith('q-1', TENANT, null, {
        quantity: 5,
        reuseSlice: true,
      });
    });
  });

  describe('placeOrder', () => {
    it('claims at the shown price with the visitor contact, then converts', async () => {
      repo
        .findQuote!.mockResolvedValueOnce(quoteRow())
        .mockResolvedValueOnce(
          quoteRow({ status: 'approved', order_id: 'o-1', order_number: 'ORD-1' }),
        );
      const result = await service.placeOrder(SESSION, 'q-1', 12_300, {
        name: ' Sam ',
        email: 'Sam@Example.com ',
      });
      expect(repo.claimForOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess-1',
          expectedTotalCents: 12_300,
          contact: { name: 'Sam', email: 'sam@example.com', phone: null },
        }),
      );
      expect(quotes.convertToOrder).toHaveBeenCalledWith('q-1', TENANT, null);
      expect(result.order).toEqual({ id: 'o-1', order_number: 'ORD-1' });
    });

    it('reports a changed price instead of ordering', async () => {
      repo.claimForOrder!.mockResolvedValueOnce(false);
      await expect(
        service.placeOrder(SESSION, 'q-1', 99, { name: 'Sam', phone: '+20 100 000 0000' }),
      ).rejects.toMatchObject({ code: 'embed.price_changed' });
      expect(quotes.convertToOrder).not.toHaveBeenCalled();
    });

    it("can't order another session's quote", async () => {
      repo.findQuote!.mockResolvedValueOnce(null);
      await expect(service.placeOrder(SESSION, 'q-x', 1, { name: 'Sam' })).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('settings', () => {
    it('normalizes and de-duplicates allowed origins', async () => {
      repo.ensureSettings = vi.fn().mockResolvedValue({ ...SHOP, updated_at: new Date() });
      repo.updateSettings = vi.fn();
      await service.updateSettings(TENANT, {
        allowedOrigins: ['https://WWW.3dprintit.example/', 'https://www.3dprintit.example'],
      });
      expect(repo.updateSettings).toHaveBeenCalledWith(TENANT, {
        allowedOrigins: ['https://www.3dprintit.example'],
      });
    });

    it('rejects something that is not a website address', async () => {
      repo.ensureSettings = vi.fn().mockResolvedValue(SHOP);
      await expect(
        service.updateSettings(TENANT, { allowedOrigins: ['http://insecure.example'] }),
      ).rejects.toMatchObject({ code: 'embed.invalid_origin' });
    });
  });
});
