-- Orders table for managing production orders
-- Supports full order lifecycle from quote acceptance to delivery

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    shop_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    quote_id UUID NOT NULL,
    
    -- Order identification
    order_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Order status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'production', 'printing', 'quality_check', 'completed', 'delivered', 'cancelled'
    )),
    
    -- Pricing (from quote)
    subtotal_cents INTEGER NOT NULL,
    tax_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Payment status
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'partial', 'refunded', 'failed'
    )),
    paid_amount_cents INTEGER NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Production status
    production_status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (production_status IN (
        'not_started', 'queued', 'in_progress', 'paused', 'completed', 'failed'
    )),
    printer_id UUID,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Quality check
    quality_check_status VARCHAR(20) CHECK (quality_check_status IN (
        'pending', 'passed', 'failed', 'needs_rework'
    )),
    quality_check_notes TEXT,
    quality_check_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'not_shipped' CHECK (delivery_status IN (
        'not_shipped', 'processing', 'shipped', 'delivered', 'returned'
    )),
    shipping_address JSONB,
    tracking_number VARCHAR(255),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    internal_notes TEXT,
    customer_notes TEXT,
    cancellation_reason TEXT,
    
    -- Audit fields
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_orders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    -- CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_printer FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE SET NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_shop ON orders(shop_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_quote ON orders(quote_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_production_status ON orders(production_status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_delivery_status ON orders(delivery_status);

-- Composite indexes for common queries
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_shop_production ON orders(shop_id, production_status);

-- Order history for tracking status changes
CREATE TABLE IF NOT EXISTS order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    status_type VARCHAR(20) NOT NULL, -- order, payment, production, quality, delivery
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    CONSTRAINT fk_order_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_order_history_order ON order_history(order_id);
CREATE INDEX idx_order_history_changed_at ON order_history(changed_at DESC);
CREATE INDEX idx_order_history_status_type ON order_history(status_type);

-- Order items for multi-item orders
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    
    -- Item details
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Pricing per item
    unit_price_cents INTEGER NOT NULL,
    total_price_cents INTEGER NOT NULL,
    
    -- Production tracking per item
    production_status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (production_status IN (
        'not_started', 'queued', 'in_progress', 'paused', 'completed', 'failed'
    )),
    printer_id UUID,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_printer FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_printer ON order_items(printer_id);
CREATE INDEX idx_order_items_production_status ON order_items(production_status);

-- Function to update updated_at timestamp for orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at for orders
CREATE TRIGGER trigger_update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id UUID, p_shop_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_date_part VARCHAR(8);
    v_sequence INTEGER;
    v_order_number VARCHAR(50);
BEGIN
    -- Get date part in YYYYMMDD format
    v_date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get next sequence for this shop/date
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number, 10) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM orders
    WHERE shop_id = p_shop_id
    AND order_number LIKE v_date_part || '%';
    
    -- Generate order number: SHOPID-YYYYMMDD-SEQUENCE
    v_order_number := (SELECT slug FROM shops WHERE id = p_shop_id) || '-' || v_date_part || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;
