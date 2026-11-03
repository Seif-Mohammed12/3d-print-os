import type { Pool, PoolClient } from 'pg';

import { query, withTenantSession } from '@3d-print-os/persistence';

import type { PortalQuoteRow } from '../portal/domain/portal-quote';
import {
  type PortalPrinter,
  PRINTER_COLUMNS,
  QUOTABLE_PRINTER,
  QUOTE_SELECT,
} from '../portal/portal.repository';
import { newPublishableKey } from './domain/embed-rules';

export type EmbedSettingsRow = {
  tenant_id: string;
  publishable_key: string;
  is_enabled: boolean;
  allowed_origins: string[];
  printer_ids: string[] | null;
  theme_json: Record<string, unknown>;
  guest_customer_id: string | null;
  updated_at: Date;
};

/** The shop an embed key belongs to, with what the quoter needs to start. */
export type EmbedShop = EmbedSettingsRow & {
  shop_name: string;
  currency: string;
  quote_validity_hours: number;
};

export type EmbedSession = {
  id: string;
  tenant_id: string;
  origin: string;
  upload_count: number;
  expires_at: Date;
};

export type GuestContact = {
  name: string;
  email: string | null;
  phone: string | null;
};

const SETTINGS_COLUMNS = `es.tenant_id, es.publishable_key, es.is_enabled, es.allowed_origins,
  es.printer_ids, es.theme_json, es.guest_customer_id, es.updated_at`;

/** Embed quotes of one visitor session. $1 = tenant, $2 = session. */
const SESSION_QUOTES = `q.tenant_id = $1 AND q.embed_session_id = $2 AND q.source = 'embed'`;

const UNIQUE_VIOLATION = '23505';

export class EmbedRepository {
  constructor(private readonly pool: Pool) {}

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------

  async findSettings(tenantId: string): Promise<EmbedSettingsRow | null> {
    const result = await query<EmbedSettingsRow>(
      this.pool,
      `SELECT ${SETTINGS_COLUMNS} FROM embed_settings es WHERE es.tenant_id = $1`,
      [tenantId],
    );
    return result.rows[0] ?? null;
  }

  /** Settings for the shop, created (disabled, with a fresh key) the first time. */
  async ensureSettings(tenantId: string): Promise<EmbedSettingsRow> {
    await query(
      this.pool,
      `INSERT INTO embed_settings (tenant_id, publishable_key) VALUES ($1, $2)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId, newPublishableKey()],
    );
    return (await this.findSettings(tenantId))!;
  }

  async updateSettings(
    tenantId: string,
    patch: {
      isEnabled?: boolean;
      allowedOrigins?: string[];
      printerIds?: string[] | null;
      theme?: Record<string, unknown>;
    },
  ): Promise<void> {
    await query(
      this.pool,
      `UPDATE embed_settings SET
         is_enabled = COALESCE($2, is_enabled),
         allowed_origins = COALESCE($3, allowed_origins),
         printer_ids = CASE WHEN $4::boolean THEN $5::uuid[] ELSE printer_ids END,
         theme_json = COALESCE($6, theme_json),
         updated_at = now()
       WHERE tenant_id = $1`,
      [
        tenantId,
        patch.isEnabled ?? null,
        patch.allowedOrigins ?? null,
        patch.printerIds !== undefined,
        patch.printerIds ?? null,
        patch.theme ? JSON.stringify(patch.theme) : null,
      ],
    );
  }

  /** New key; the old one stops working at once and its open sessions are ended. */
  async rotateKey(tenantId: string): Promise<void> {
    await withTenantSession(this.pool, { tenantId }, async (client) => {
      await client.query(
        `UPDATE embed_settings SET publishable_key = $2, updated_at = now() WHERE tenant_id = $1`,
        [tenantId, newPublishableKey()],
      );
      await client.query(
        `UPDATE embed_sessions SET expires_at = now() WHERE tenant_id = $1 AND expires_at > now()`,
        [tenantId],
      );
    });
  }

  /** Looking up by key is the one cross-tenant read: the key is how a visitor names a shop. */
  async findShopByKey(publishableKey: string): Promise<EmbedShop | null> {
    const result = await query<EmbedShop>(
      this.pool,
      `SELECT ${SETTINGS_COLUMNS}, t.name AS shop_name, t.default_currency AS currency,
         COALESCE(ts.quote_validity_hours, 72) AS quote_validity_hours
       FROM embed_settings es
       INNER JOIN tenants t ON t.id = es.tenant_id AND t.status = 'active'
       LEFT JOIN tenant_settings ts ON ts.tenant_id = es.tenant_id
       WHERE es.publishable_key = $1`,
      [publishableKey],
    );
    const row = result.rows[0];
    return row ? { ...row, currency: row.currency.trim() } : null;
  }

  async findShopByTenant(tenantId: string): Promise<EmbedShop | null> {
    const settings = await this.findSettings(tenantId);
    return settings ? this.findShopByKey(settings.publishable_key) : null;
  }

  // -------------------------------------------------------------------------
  // Printers visitors may pick
  // -------------------------------------------------------------------------

  /** Active FDM printers, limited to the shop's pick when it made one. */
  async listPrinters(tenantId: string, printerIds: string[] | null): Promise<PortalPrinter[]> {
    const result = await query<PortalPrinter>(
      this.pool,
      `SELECT ${PRINTER_COLUMNS} FROM printers p
       WHERE p.tenant_id = $1 AND ${QUOTABLE_PRINTER}
         AND ($2::uuid[] IS NULL OR p.id = ANY($2::uuid[]))
       ORDER BY p.created_at, p.id`,
      [tenantId, printerIds],
    );
    return result.rows;
  }

  // -------------------------------------------------------------------------
  // Sessions
  // -------------------------------------------------------------------------

  async createSession(
    tenantId: string,
    tokenHash: string,
    origin: string,
    expiresAt: Date,
  ): Promise<EmbedSession> {
    const result = await query<EmbedSession>(
      this.pool,
      `INSERT INTO embed_sessions (tenant_id, token_hash, origin, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tenant_id, origin, upload_count, expires_at`,
      [tenantId, tokenHash, origin, expiresAt],
    );
    return result.rows[0]!;
  }

  /** A live session whose shop still has the embed turned on. */
  async findLiveSession(tokenHash: string): Promise<EmbedSession | null> {
    const result = await query<EmbedSession>(
      this.pool,
      `SELECT s.id, s.tenant_id, s.origin, s.upload_count, s.expires_at
       FROM embed_sessions s
       INNER JOIN embed_settings es ON es.tenant_id = s.tenant_id AND es.is_enabled
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  /** Counts an upload against the session's cap; false once the cap is reached. */
  async claimUploadSlot(tenantId: string, sessionId: string, max: number): Promise<boolean> {
    const result = await query(
      this.pool,
      `UPDATE embed_sessions SET upload_count = upload_count + 1
       WHERE tenant_id = $1 AND id = $2 AND upload_count < $3`,
      [tenantId, sessionId, max],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async countSessionQuotes(tenantId: string, sessionId: string): Promise<number> {
    const result = await query<{ count: string }>(
      this.pool,
      `SELECT count(*) FROM quotes q WHERE ${SESSION_QUOTES}`,
      [tenantId, sessionId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  // -------------------------------------------------------------------------
  // Models and quotes
  // -------------------------------------------------------------------------

  async findSessionModel(
    tenantId: string,
    sessionId: string,
    modelId: string,
  ): Promise<{ id: string; status: string } | null> {
    const result = await query<{ id: string; status: string }>(
      this.pool,
      `SELECT id, status FROM model_files
       WHERE tenant_id = $1 AND id = $2 AND embed_session_id = $3 AND deleted_at IS NULL`,
      [tenantId, modelId, sessionId],
    );
    return result.rows[0] ?? null;
  }

  async findQuote(
    tenantId: string,
    sessionId: string,
    quoteId: string,
  ): Promise<PortalQuoteRow | null> {
    const result = await query<PortalQuoteRow>(
      this.pool,
      `${QUOTE_SELECT} WHERE ${SESSION_QUOTES} AND q.id = $3`,
      [tenantId, sessionId, quoteId],
    );
    return result.rows[0] ?? null;
  }

  async setQuoteSession(tenantId: string, quoteId: string, sessionId: string): Promise<void> {
    await query(
      this.pool,
      `UPDATE quotes SET embed_session_id = $3 WHERE tenant_id = $1 AND id = $2`,
      [tenantId, quoteId, sessionId],
    );
  }

  /**
   * The CRM customer that holds a shop's unordered embed quotes ("Website visitors").
   * quotes.customer_id is required, but a visitor only says who they are when they order.
   */
  async ensureGuestCustomer(tenantId: string, shopId: string): Promise<string> {
    return withTenantSession(this.pool, { tenantId }, async (client) => {
      const settings = await client.query<{ guest_customer_id: string | null }>(
        `SELECT guest_customer_id FROM embed_settings WHERE tenant_id = $1 FOR UPDATE`,
        [tenantId],
      );
      const existing = settings.rows[0]?.guest_customer_id;
      if (existing) {
        const live = await client.query(
          `SELECT 1 FROM customers WHERE id = $1 AND tenant_id = $2`,
          [existing, tenantId],
        );
        if ((live.rowCount ?? 0) > 0) {
          return existing;
        }
      }
      const created = await client.query<{ id: string }>(
        `INSERT INTO customers (tenant_id, shop_id, name, customer_type, notes)
         VALUES ($1, $2, 'Website visitors', 'individual', $3)
         RETURNING id`,
        [
          tenantId,
          shopId,
          'Holds quotes priced on your website that have not been ordered yet. ' +
            'Each order moves to its own customer record.',
        ],
      );
      const id = created.rows[0]!.id;
      await client.query(`UPDATE embed_settings SET guest_customer_id = $2 WHERE tenant_id = $1`, [
        tenantId,
        id,
      ]);
      return id;
    });
  }

  /**
   * Atomically: create the visitor's CRM customer and move their priced, unexpired quote to
   * approved under that customer, provided the price is still the one they saw. Nothing is
   * written (no stray customer) when any condition no longer holds.
   */
  async claimForOrder(input: {
    tenantId: string;
    sessionId: string;
    quoteId: string;
    shopId: string;
    expectedTotalCents: number;
    contact: GuestContact;
    notes: string | null;
  }): Promise<boolean> {
    return withTenantSession(this.pool, { tenantId: input.tenantId }, async (client) => {
      const locked = await client.query(
        `SELECT q.id FROM quotes q
         WHERE ${SESSION_QUOTES} AND q.id = $3
           AND q.status = 'pending' AND q.estimate_source = 'slicer'
           AND q.total_cents = $4
           AND (q.expires_at IS NULL OR q.expires_at > now())
         FOR UPDATE`,
        [input.tenantId, input.sessionId, input.quoteId, input.expectedTotalCents],
      );
      if ((locked.rowCount ?? 0) === 0) {
        return false;
      }

      const customerId = await this.insertCustomer(client, input);
      await client.query(
        `UPDATE quotes SET status = 'approved', approved_at = now(), customer_id = $3,
           customer_notes = COALESCE($4, customer_notes)
         WHERE tenant_id = $1 AND id = $2`,
        [input.tenantId, input.quoteId, customerId, input.notes],
      );
      await client.query(
        `INSERT INTO quote_history (quote_id, old_status, new_status, changed_by, notes)
         VALUES ($1, 'pending', 'approved', NULL, 'Ordered by a visitor on the shop website')`,
        [input.quoteId],
      );
      return true;
    });
  }

  private async insertCustomer(
    client: PoolClient,
    input: { tenantId: string; shopId: string; contact: GuestContact },
  ): Promise<string> {
    const { contact } = input;
    const insert = (email: string | null, notes: string) =>
      client.query<{ id: string }>(
        `INSERT INTO customers (tenant_id, shop_id, name, email, phone, customer_type, notes)
         VALUES ($1, $2, $3, $4, $5, 'individual', $6)
         RETURNING id`,
        [input.tenantId, input.shopId, contact.name, email, contact.phone, notes],
      );

    const note = 'Ordered through the quoter on your website. Contact details are unverified.';
    if (!contact.email) {
      return (await insert(null, note)).rows[0]!.id;
    }
    // customers.email is unique across all tenants, so another record may already hold it.
    await client.query('SAVEPOINT embed_customer');
    try {
      const created = await insert(contact.email, note);
      await client.query('RELEASE SAVEPOINT embed_customer');
      return created.rows[0]!.id;
    } catch (error) {
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) {
        throw error;
      }
      await client.query('ROLLBACK TO SAVEPOINT embed_customer');
      const created = await insert(
        null,
        `${note} Email ${contact.email} is already on another customer record; merge them if ` +
          'they are the same person.',
      );
      return created.rows[0]!.id;
    }
  }
}
