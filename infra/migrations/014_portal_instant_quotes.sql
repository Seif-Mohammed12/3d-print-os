-- 014_portal_instant_quotes.sql
-- Instant, slicer-priced quotes for portal customers.
--
-- Portal customers now get real `quotes` rows (priced by the same slicer pipeline as staff
-- quotes) and accepting one creates a real `orders` row. The older request-only tables
-- (customer_quotes, customer_orders from 010) are no longer read or written by the API.

-- ---------------------------------------------------------------------------
-- Quotes: quantity, where the quote came from, and the quality the customer picked
-- ---------------------------------------------------------------------------
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1
    CHECK (quantity BETWEEN 1 AND 1000),
  ADD COLUMN IF NOT EXISTS source varchar(10) NOT NULL DEFAULT 'staff'
    CHECK (source IN ('staff', 'portal')),
  ADD COLUMN IF NOT EXISTS print_quality varchar(10)
    CHECK (print_quality IS NULL OR print_quality IN ('draft', 'standard', 'fine'));

CREATE INDEX IF NOT EXISTS idx_quotes_tenant_customer_source
  ON quotes (tenant_id, customer_id, source);

-- ---------------------------------------------------------------------------
-- Portal customer -> CRM customer
-- ---------------------------------------------------------------------------
-- Quotes and orders reference the CRM `customers` table. Each portal account gets its own
-- CRM row, created on its first quote (never matched by email: emails are not verified at
-- sign-up, so matching would let anyone claim an existing customer's history).
ALTER TABLE portal_customers
  ADD COLUMN IF NOT EXISTS crm_customer_id uuid REFERENCES customers (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS portal_customers_crm_customer_id_key
  ON portal_customers (crm_customer_id)
  WHERE crm_customer_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- The printer the shop prices portal quotes on
-- ---------------------------------------------------------------------------
-- NULL means "the oldest active FDM printer".
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS portal_printer_id uuid REFERENCES printers (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Legacy request tables
-- ---------------------------------------------------------------------------
-- Kept (not dropped) so pending legacy requests can be reviewed and re-quoted by staff.
-- They have no material, printer or price, so they cannot be converted automatically.
COMMENT ON TABLE customer_quotes IS
  'Deprecated by 014: portal quotes live in quotes (source = portal). Not used by the API.';
COMMENT ON TABLE customer_orders IS
  'Deprecated by 014: portal orders live in orders. Not used by the API.';
