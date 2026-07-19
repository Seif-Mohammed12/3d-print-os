-- Pricing rules table for configurable pricing engine
-- Supports hierarchical rules: tenant -> shop -> material -> printer

CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    shop_id UUID,
    material_id UUID,
    printer_id UUID,
    
    -- Rule priority (higher = more specific)
    priority INTEGER NOT NULL DEFAULT 0,
    
    -- Material cost configuration
    material_cost_per_gram INTEGER NOT NULL DEFAULT 0, -- in minor currency units (cents)
    material_cost_per_mm3 INTEGER NOT NULL DEFAULT 0, -- alternative volume-based pricing
    
    -- Machine time cost
    machine_time_cost_per_minute INTEGER NOT NULL DEFAULT 0,
    
    -- Electricity cost
    electricity_cost_per_hour INTEGER NOT NULL DEFAULT 0,
    
    -- Maintenance cost
    maintenance_cost_per_hour INTEGER NOT NULL DEFAULT 0,
    
    -- Failure risk (percentage as integer, e.g., 5 = 5%)
    failure_risk_percentage INTEGER NOT NULL DEFAULT 0,
    
    -- Post processing cost
    post_processing_cost_per_unit INTEGER NOT NULL DEFAULT 0,
    post_processing_fixed_cost INTEGER NOT NULL DEFAULT 0,
    
    -- Profit margin (percentage as integer, e.g., 20 = 20%)
    profit_margin_percentage INTEGER NOT NULL DEFAULT 20,
    
    -- Minimum price
    minimum_price INTEGER NOT NULL DEFAULT 0,
    
    -- Rule status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_failure_risk CHECK (failure_risk_percentage >= 0 AND failure_risk_percentage <= 100),
    CONSTRAINT valid_profit_margin CHECK (profit_margin_percentage >= 0 AND profit_margin_percentage <= 100),
    CONSTRAINT valid_costs CHECK (
        material_cost_per_gram >= 0 AND
        material_cost_per_mm3 >= 0 AND
        machine_time_cost_per_minute >= 0 AND
        electricity_cost_per_hour >= 0 AND
        maintenance_cost_per_hour >= 0 AND
        post_processing_cost_per_unit >= 0 AND
        post_processing_fixed_cost >= 0 AND
        minimum_price >= 0
    ),
    
    -- Unique constraint for rule combination
    CONSTRAINT unique_rule_combination UNIQUE (
        tenant_id, shop_id, material_id, printer_id, deleted_at
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant ON pricing_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_shop ON pricing_rules(shop_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_material ON pricing_rules(material_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_printer ON pricing_rules(printer_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_priority ON pricing_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active) WHERE is_active = true;

-- Discounts table
CREATE TABLE IF NOT EXISTS pricing_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    shop_id UUID,
    
    -- Discount configuration
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value INTEGER NOT NULL, -- percentage (0-100) or fixed amount (minor units)
    
    -- Usage limits
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    
    -- Validity period
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    
    -- Conditions
    minimum_order_value INTEGER,
    applicable_materials UUID[],
    applicable_printers UUID[],
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_discount_value CHECK (
        (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100) OR
        (discount_type = 'fixed' AND discount_value > 0)
    ),
    CONSTRAINT valid_uses CHECK (max_uses IS NULL OR current_uses <= max_uses),
    CONSTRAINT unique_discount_code UNIQUE (tenant_id, code, deleted_at)
);

-- Indexes for discounts
CREATE INDEX IF NOT EXISTS idx_pricing_discounts_tenant ON pricing_discounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_discounts_shop ON pricing_discounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_pricing_discounts_code ON pricing_discounts(code);
CREATE INDEX IF NOT EXISTS idx_pricing_discounts_active ON pricing_discounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_discounts_validity ON pricing_discounts(valid_from, valid_until);

-- Rush order surcharges table
CREATE TABLE IF NOT EXISTS pricing_rush_surcharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    shop_id UUID,
    
    -- Rush tier configuration
    tier_name TEXT NOT NULL,
    hours_before_deadline INTEGER NOT NULL, -- e.g., 24 = within 24 hours
    
    -- Surcharge configuration
    surcharge_type TEXT NOT NULL CHECK (surcharge_type IN ('percentage', 'fixed')),
    surcharge_value INTEGER NOT NULL,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_surcharge CHECK (
        (surcharge_type = 'percentage' AND surcharge_value > 0 AND surcharge_value <= 100) OR
        (surcharge_type = 'fixed' AND surcharge_value > 0)
    ),
    CONSTRAINT unique_rush_tier UNIQUE (tenant_id, shop_id, tier_name, deleted_at)
);

-- Indexes for rush surcharges
CREATE INDEX IF NOT EXISTS idx_pricing_rush_tenant ON pricing_rush_surcharges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rush_shop ON pricing_rush_surcharges(shop_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rush_hours ON pricing_rush_surcharges(hours_before_deadline);
CREATE INDEX IF NOT EXISTS idx_pricing_rush_active ON pricing_rush_surcharges(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_pricing_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pricing_rules_updated_at
    BEFORE UPDATE ON pricing_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_tables_updated_at();

CREATE TRIGGER trigger_pricing_discounts_updated_at
    BEFORE UPDATE ON pricing_discounts
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_tables_updated_at();

CREATE TRIGGER trigger_pricing_rush_surcharges_updated_at
    BEFORE UPDATE ON pricing_rush_surcharges
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_tables_updated_at();

-- Row Level Security (RLS) for multi-tenancy
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rush_surcharges ENABLE ROW LEVEL SECURITY;

-- Policies for pricing_rules
CREATE POLICY pricing_rules_tenant_isolation ON pricing_rules
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY pricing_rules_service_role ON pricing_rules
    FOR ALL
    TO service_role
    USING (true);

-- Policies for pricing_discounts
CREATE POLICY pricing_discounts_tenant_isolation ON pricing_discounts
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY pricing_discounts_service_role ON pricing_discounts
    FOR ALL
    TO service_role
    USING (true);

-- Policies for pricing_rush_surcharges
CREATE POLICY pricing_rush_surcharges_tenant_isolation ON pricing_rush_surcharges
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY pricing_rush_surcharges_service_role ON pricing_rush_surcharges
    FOR ALL
    TO service_role
    USING (true);

-- Insert default tenant-level pricing rules (can be overridden by shop/material/printer specific rules)
-- These are placeholder defaults that should be configured by each tenant
