-- Quotes table for quotation workflow
-- Supports the full quote lifecycle from draft to completion

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    shop_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    model_id UUID NOT NULL,
    
    -- Quote metadata
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'completed')),
    
    -- Analysis results
    estimated_weight_grams INTEGER NOT NULL DEFAULT 0,
    estimated_time_minutes INTEGER NOT NULL DEFAULT 0,
    estimated_volume_mm3 INTEGER NOT NULL DEFAULT 0,
    surface_area_mm2 INTEGER NOT NULL DEFAULT 0,
    bounding_box_x_mm NUMERIC(10, 2),
    bounding_box_y_mm NUMERIC(10, 2),
    bounding_box_z_mm NUMERIC(10, 2),
    
    -- Material and printing
    material_id UUID,
    printer_id UUID,
    technology VARCHAR(20), -- FDM, SLA, SLS, DLP, MJ
    layer_height_mm NUMERIC(5, 3),
    infill_percentage INTEGER,
    
    -- Risk and difficulty assessment
    difficulty_score INTEGER CHECK (difficulty_score BETWEEN 1 AND 10),
    risk_percentage INTEGER CHECK (risk_percentage BETWEEN 0 AND 100),
    risk_factors JSONB, -- Array of risk factors with descriptions
    
    -- Pricing
    material_cost_cents INTEGER NOT NULL DEFAULT 0,
    machine_time_cost_cents INTEGER NOT NULL DEFAULT 0,
    electricity_cost_cents INTEGER NOT NULL DEFAULT 0,
    maintenance_cost_cents INTEGER NOT NULL DEFAULT 0,
    post_processing_cost_cents INTEGER NOT NULL DEFAULT 0,
    failure_risk_cost_cents INTEGER NOT NULL DEFAULT 0,
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Quote lifecycle
    expires_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes and metadata
    internal_notes TEXT,
    customer_notes TEXT,
    rejection_reason TEXT,
    
    -- Audit fields
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    -- Note: customer_id, material_id, printer_id FKs deferred until those tables are created
    CONSTRAINT fk_quotes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_quotes_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_quotes_model FOREIGN KEY (model_id) REFERENCES model_files(id) ON DELETE RESTRICT
    -- CONSTRAINT fk_quotes_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    -- CONSTRAINT fk_quotes_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
    -- CONSTRAINT fk_quotes_printer FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE SET NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX idx_quotes_shop ON quotes(shop_id);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_model ON quotes(model_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_expires_at ON quotes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_quotes_tenant_status ON quotes(tenant_id, status);

-- Quote items table for multi-item quotes (optional, for future use)
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    
    -- Item details
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Analysis per item
    estimated_weight_grams INTEGER NOT NULL DEFAULT 0,
    estimated_time_minutes INTEGER NOT NULL DEFAULT 0,
    
    -- Pricing per item
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    total_price_cents INTEGER NOT NULL DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_quote_items_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

-- Quote history for tracking status changes
CREATE TABLE IF NOT EXISTS quote_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    CONSTRAINT fk_quote_history_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

CREATE INDEX idx_quote_history_quote ON quote_history(quote_id);
CREATE INDEX idx_quote_history_changed_at ON quote_history(changed_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_quotes_updated_at();

-- Function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number(p_tenant_id UUID, p_shop_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_date_part VARCHAR(8);
    v_sequence INTEGER;
    v_quote_number VARCHAR(50);
BEGIN
    -- Get date part in YYYYMMDD format
    v_date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get next sequence for this shop/date
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number, 10) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM quotes
    WHERE shop_id = p_shop_id
    AND quote_number LIKE v_date_part || '%';
    
    -- Generate quote number: SHOPID-YYYYMMDD-SEQUENCE
    v_quote_number := (SELECT slug FROM shops WHERE id = p_shop_id) || '-' || v_date_part || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_quote_number;
END;
$$ LANGUAGE plpgsql;
