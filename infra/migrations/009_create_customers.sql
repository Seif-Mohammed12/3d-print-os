-- Customers table for managing customer information
-- Stores customer details for order management and analytics

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    shop_id UUID NOT NULL,
    
    -- Customer identification
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    
    -- Address information
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Customer classification
    customer_type VARCHAR(50) DEFAULT 'individual' CHECK (customer_type IN ('individual', 'business')),
    business_name VARCHAR(255),
    tax_id VARCHAR(50),
    
    -- Customer status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    
    -- Notes
    notes TEXT,
    
    -- Audit fields
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_customers_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_shop ON customers(shop_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_customer_type ON customers(customer_type);

-- Update trigger for customers
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();
