-- 012_business_rls.sql
-- Tenant isolation for the business tables created in 002–011.
--
-- Tables with tenant_id use the same policy as model_files (0002). Child tables without
-- tenant_id are scoped through an EXISTS join on their parent, like role_permissions in 0001,
-- so no backfill is needed and a child can never disagree with its parent's tenant.
--
-- Repositories also filter on tenant_id explicitly: RLS does not apply to the table owner
-- (no FORCE ROW LEVEL SECURITY here, matching 0001/0002), so it only binds connections
-- made as a non-owner role.

-- ---------------------------------------------------------------------------
-- Tables with tenant_id
-- ---------------------------------------------------------------------------

-- 002 enabled RLS on the pricing tables with policies that read app.current_tenant_id,
-- which withTenantSession never sets (it sets app.tenant_id), and that error when it is
-- unset. Replace them with the standard policy. The service_role policies stay.
DROP POLICY IF EXISTS pricing_rules_tenant_isolation ON pricing_rules;
DROP POLICY IF EXISTS pricing_discounts_tenant_isolation ON pricing_discounts;
DROP POLICY IF EXISTS pricing_rush_surcharges_tenant_isolation ON pricing_rush_surcharges;

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY pricing_rules_isolation ON pricing_rules
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

ALTER TABLE pricing_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY pricing_discounts_isolation ON pricing_discounts
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

ALTER TABLE pricing_rush_surcharges ENABLE ROW LEVEL SECURITY;
CREATE POLICY pricing_rush_surcharges_isolation ON pricing_rush_surcharges
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_isolation ON quotes
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
CREATE POLICY printers_isolation ON printers
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY materials_isolation ON materials
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_isolation ON orders
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

ALTER TABLE training_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY training_samples_isolation ON training_samples
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

ALTER TABLE dataset_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY dataset_exports_isolation ON dataset_exports
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

ALTER TABLE model_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY model_performance_isolation ON model_performance
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_isolation ON customers
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

-- portal_customers, customer_quotes and customer_orders already have RLS from 010.

-- ---------------------------------------------------------------------------
-- Child tables: scoped through the parent row
-- ---------------------------------------------------------------------------

ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_items_isolation ON quote_items
  USING (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.tenant_id = app_current_tenant_id())
  )
  WITH CHECK (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.tenant_id = app_current_tenant_id())
  );

ALTER TABLE quote_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_history_isolation ON quote_history
  USING (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.tenant_id = app_current_tenant_id())
  )
  WITH CHECK (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.tenant_id = app_current_tenant_id())
  );

ALTER TABLE printer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY printer_profiles_isolation ON printer_profiles
  USING (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM printers p WHERE p.id = printer_id AND p.tenant_id = app_current_tenant_id())
  )
  WITH CHECK (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM printers p WHERE p.id = printer_id AND p.tenant_id = app_current_tenant_id())
  );

ALTER TABLE printer_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY printer_capabilities_isolation ON printer_capabilities
  USING (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM printers p WHERE p.id = printer_id AND p.tenant_id = app_current_tenant_id())
  )
  WITH CHECK (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM printers p WHERE p.id = printer_id AND p.tenant_id = app_current_tenant_id())
  );

-- Both sides must belong to the tenant, so a row can't link one tenant's material to
-- another tenant's printer.
ALTER TABLE material_printer_compatibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY material_printer_compatibility_isolation ON material_printer_compatibility
  USING (
    app_rls_bypass()
    OR (
      EXISTS (SELECT 1 FROM materials m WHERE m.id = material_id AND m.tenant_id = app_current_tenant_id())
      AND EXISTS (SELECT 1 FROM printers p WHERE p.id = printer_id AND p.tenant_id = app_current_tenant_id())
    )
  )
  WITH CHECK (
    app_rls_bypass()
    OR (
      EXISTS (SELECT 1 FROM materials m WHERE m.id = material_id AND m.tenant_id = app_current_tenant_id())
      AND EXISTS (SELECT 1 FROM printers p WHERE p.id = printer_id AND p.tenant_id = app_current_tenant_id())
    )
  );

ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_history_isolation ON order_history
  USING (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.tenant_id = app_current_tenant_id())
  )
  WITH CHECK (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.tenant_id = app_current_tenant_id())
  );

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_items_isolation ON order_items
  USING (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.tenant_id = app_current_tenant_id())
  )
  WITH CHECK (
    app_rls_bypass()
    OR EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.tenant_id = app_current_tenant_id())
  );

ALTER TABLE feature_vectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY feature_vectors_isolation ON feature_vectors
  USING (
    app_rls_bypass()
    OR EXISTS (
      SELECT 1 FROM training_samples s
      WHERE s.id = training_sample_id AND s.tenant_id = app_current_tenant_id()
    )
  )
  WITH CHECK (
    app_rls_bypass()
    OR EXISTS (
      SELECT 1 FROM training_samples s
      WHERE s.id = training_sample_id AND s.tenant_id = app_current_tenant_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Analytics views (007): evaluate the underlying tables' RLS as the querying role
-- instead of the view owner. Needs PostgreSQL 15+.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'analytics_revenue',
    'analytics_material_usage',
    'analytics_printer_utilization',
    'analytics_order_status',
    'analytics_customers',
    'analytics_profitability',
    'analytics_daily_summary'
  ] LOOP
    EXECUTE format('ALTER VIEW %I SET (security_invoker = true)', v);
  END LOOP;
EXCEPTION
  WHEN invalid_parameter_value OR syntax_error THEN
    RAISE NOTICE 'security_invoker unsupported (PostgreSQL < 15); analytics views rely on repository tenant filters';
END $$;
