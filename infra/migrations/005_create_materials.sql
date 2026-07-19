-- Materials table for managing 3D printing materials
-- Supports various material types with pricing and printer compatibility

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Material identification
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    material_type VARCHAR(50) NOT NULL, -- PLA, ABS, PETG, TPU, Resin, etc.
    color VARCHAR(100),
    color_code VARCHAR(7), -- Hex color code
    
    -- Physical properties
    density_g_per_cm3 NUMERIC(5, 3) NOT NULL,
    
    -- Pricing
    price_per_gram_cents INTEGER NOT NULL, -- Price in cents per gram
    price_per_kg_cents INTEGER GENERATED ALWAYS AS (price_per_gram_cents * 1000) STORED,
    
    -- Temperature settings (for FDM)
    nozzle_temperature_min_celsius INTEGER,
    nozzle_temperature_max_celsius INTEGER,
    bed_temperature_min_celsius INTEGER,
    bed_temperature_max_celsius INTEGER,
    chamber_temperature_celsius INTEGER,
    
    -- Print settings
    recommended_layer_height_mm NUMERIC(5, 3),
    recommended_infill_percentage INTEGER,
    print_speed_mm_per_min NUMERIC(10, 2),
    
    -- Material properties
    tensile_strength_mpa NUMERIC(10, 2),
    flexural_strength_mpa NUMERIC(10, 2),
    impact_strength_j_per_m NUMERIC(10, 2),
    elongation_at_break_percentage NUMERIC(5, 2),
    
    -- Storage and handling
    storage_conditions TEXT,
    shelf_life_months INTEGER,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    -- Audit fields
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_materials_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX idx_materials_tenant ON materials(tenant_id);
CREATE INDEX idx_materials_type ON materials(material_type);
CREATE INDEX idx_materials_brand ON materials(brand);
CREATE INDEX idx_materials_active ON materials(is_active) WHERE is_active = true;
CREATE INDEX idx_materials_created_at ON materials(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_materials_tenant_type ON materials(tenant_id, material_type);

-- Material printer compatibility table
CREATE TABLE IF NOT EXISTS material_printer_compatibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL,
    printer_id UUID NOT NULL,
    
    -- Compatibility settings
    is_compatible BOOLEAN NOT NULL DEFAULT true,
    
    -- Override settings for this material-printer combination
    override_nozzle_temperature_celsius INTEGER,
    override_bed_temperature_celsius INTEGER,
    override_print_speed_mm_per_min NUMERIC(10, 2),
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_material_compatibility_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    CONSTRAINT fk_material_compatibility_printer FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE,
    CONSTRAINT uk_material_printer UNIQUE (material_id, printer_id)
);

CREATE INDEX idx_material_compatibility_material ON material_printer_compatibility(material_id);
CREATE INDEX idx_material_compatibility_printer ON material_printer_compatibility(printer_id);
CREATE INDEX idx_material_compatibility_compatible ON material_printer_compatibility(is_compatible) WHERE is_compatible = true;

-- Function to update updated_at timestamp for materials
CREATE OR REPLACE FUNCTION update_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at for materials
CREATE TRIGGER trigger_update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_materials_updated_at();
