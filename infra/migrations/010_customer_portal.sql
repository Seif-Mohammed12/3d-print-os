-- 010_customer_portal.sql
-- Customer portal tables and role-based access system

-- ---------------------------------------------------------------------------
-- Portal customer accounts (links portal users to tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE portal_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone text,
  company_name text,
  address_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX portal_customers_user_id_idx ON portal_customers(user_id);
CREATE INDEX portal_customers_tenant_id_idx ON portal_customers(tenant_id);

-- ---------------------------------------------------------------------------
-- Customer quotes (public-facing quote requests)
-- ---------------------------------------------------------------------------
CREATE TABLE customer_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES portal_customers(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_file_id uuid REFERENCES model_files(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'expired')),
  estimated_price_min numeric(10,2),
  estimated_price_max numeric(10,2),
  final_price numeric(10,2),
  valid_until timestamptz,
  notes text,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customer_quotes_customer_id_idx ON customer_quotes(customer_id);
CREATE INDEX customer_quotes_tenant_id_idx ON customer_quotes(tenant_id);
CREATE INDEX customer_quotes_status_idx ON customer_quotes(status);

-- ---------------------------------------------------------------------------
-- Customer orders (public-facing order tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE customer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES portal_customers(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES customer_quotes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  tracking_code text UNIQUE,
  estimated_completion timestamptz,
  actual_completion timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customer_orders_customer_id_idx ON customer_orders(customer_id);
CREATE INDEX customer_orders_tenant_id_idx ON customer_orders(tenant_id);
CREATE INDEX customer_orders_status_idx ON customer_orders(status);
CREATE INDEX customer_orders_tracking_code_idx ON customer_orders(tracking_code);

-- ---------------------------------------------------------------------------
-- Update roles table to allow system-wide roles (tenant_id can be null)
-- ---------------------------------------------------------------------------
ALTER TABLE roles ALTER COLUMN tenant_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- Add customer role and permissions to database
-- ---------------------------------------------------------------------------
-- Insert system roles (tenant_id = null for system-wide roles)
INSERT INTO roles (tenant_id, code, name, is_system) VALUES
  (null, 'owner', 'Owner', true),
  (null, 'admin', 'Admin', true),
  (null, 'employee', 'Employee', true),
  (null, 'customer', 'Customer', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Add customer portal permissions
-- ---------------------------------------------------------------------------
INSERT INTO permissions (code, description, module) VALUES
  ('portal:upload', 'Upload 3D models', 'portal'),
  ('portal:quotes:create', 'Create quote requests', 'portal'),
  ('portal:quotes:read', 'View own quotes', 'portal'),
  ('portal:orders:read', 'View own orders', 'portal'),
  ('portal:orders:track', 'Track order status', 'portal'),
  ('dashboard:read', 'View business dashboard', 'business'),
  ('intelligence:read', 'Access AI tools', 'intelligence'),
  ('intelligence:write', 'Manage AI tools', 'intelligence'),
  ('production:read', 'View production data', 'production'),
  ('production:write', 'Manage production', 'production'),
  ('business:read', 'View business data', 'business'),
  ('business:write', 'Manage business operations', 'business'),
  ('config:read', 'View configuration', 'config'),
  ('config:write', 'Modify configuration', 'config')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Assign permissions to roles
-- ---------------------------------------------------------------------------
-- Owner: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.code = 'owner' AND r.tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- Admin: All except tenant deletion
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.code = 'admin' AND r.tenant_id IS NULL 
  AND p.code NOT IN ('settings:write')
ON CONFLICT DO NOTHING;

-- Employee: Production and business read/write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.code = 'employee' AND r.tenant_id IS NULL 
  AND p.module IN ('production', 'business', 'intelligence')
ON CONFLICT DO NOTHING;

-- Customer: Portal permissions only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.code = 'customer' AND r.tenant_id IS NULL 
  AND p.module = 'portal'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Row Level Security for customer tables
-- ---------------------------------------------------------------------------
ALTER TABLE portal_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;

-- Portal customers: readable by bypass OR own tenant
CREATE POLICY portal_customers_isolation ON portal_customers
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

-- Customer quotes: readable by bypass OR own tenant OR own customer
CREATE POLICY customer_quotes_isolation ON customer_quotes
  USING (
    app_rls_bypass() 
    OR tenant_id = app_current_tenant_id()
    OR customer_id IN (
      SELECT id FROM portal_customers 
      WHERE user_id = (SELECT id FROM users WHERE email = current_setting('app.user_email', true))
    )
  )
  WITH CHECK (
    app_rls_bypass() 
    OR tenant_id = app_current_tenant_id()
  );

-- Customer orders: readable by bypass OR own tenant OR own customer
CREATE POLICY customer_orders_isolation ON customer_orders
  USING (
    app_rls_bypass() 
    OR tenant_id = app_current_tenant_id()
    OR customer_id IN (
      SELECT id FROM portal_customers 
      WHERE user_id = (SELECT id FROM users WHERE email = current_setting('app.user_email', true))
    )
  )
  WITH CHECK (
    app_rls_bypass() 
    OR tenant_id = app_current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- Update function to handle user email context
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_user_email() RETURNS text AS $$
  SELECT nullif(current_setting('app.user_email', true), '')::text;
$$ LANGUAGE sql STABLE;
