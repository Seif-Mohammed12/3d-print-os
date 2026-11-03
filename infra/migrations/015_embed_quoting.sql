-- 015_embed_quoting.sql
-- The embeddable quoter: a shop puts a script tag on its own website and visitors get a
-- slicer price and place an order without an account.
--
-- Visitors are anonymous: each browser gets an embed session (an opaque token, stored here
-- only as a SHA-256 hash). Models and quotes are owned by that session, not by a user. When
-- the visitor orders, they give a name, email and phone, and the API creates a CRM customer
-- for that order (never matched to an existing customer by email: nothing is verified).

-- ---------------------------------------------------------------------------
-- Per-shop embed settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS embed_settings (
  tenant_id uuid PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
  -- Public, like a Stripe publishable key: identifies the shop, grants nothing on its own.
  publishable_key text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  -- Exact origins ("https://shop.example") allowed to embed the quoter or call its API.
  allowed_origins text[] NOT NULL DEFAULT '{}',
  -- Printers visitors may pick; NULL means every active FDM printer.
  printer_ids uuid[],
  -- Default look: { accent, background, foreground, radius, font_family }.
  theme_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Holds unordered embed quotes (quotes.customer_id is NOT NULL); created on first use.
  guest_customer_id uuid REFERENCES customers (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE embed_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY embed_settings_isolation ON embed_settings
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

-- ---------------------------------------------------------------------------
-- Anonymous visitor sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS embed_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  -- The host page the session was started from (checked against allowed_origins).
  origin text NOT NULL,
  upload_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS embed_sessions_tenant_id_idx ON embed_sessions (tenant_id);

ALTER TABLE embed_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY embed_sessions_isolation ON embed_sessions
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

-- ---------------------------------------------------------------------------
-- Models and quotes owned by a session instead of a user
-- ---------------------------------------------------------------------------
ALTER TABLE model_files
  ALTER COLUMN uploaded_by_user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS embed_session_id uuid REFERENCES embed_sessions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS model_files_embed_session_id_idx
  ON model_files (embed_session_id) WHERE embed_session_id IS NOT NULL;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS embed_session_id uuid REFERENCES embed_sessions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_embed_session
  ON quotes (tenant_id, embed_session_id) WHERE embed_session_id IS NOT NULL;

-- 014 named its inline check quotes_source_check.
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_source_check;
ALTER TABLE quotes
  ADD CONSTRAINT quotes_source_check CHECK (source IN ('staff', 'portal', 'embed'));
