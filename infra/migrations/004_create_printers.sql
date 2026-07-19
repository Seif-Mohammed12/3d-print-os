-- Printers table for managing 3D printers
-- Supports multiple printers per shop with profiles and capabilities

CREATE TABLE IF NOT EXISTS printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    shop_id UUID NOT NULL,
    
    -- Printer identification
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    
    -- Technology type
    technology VARCHAR(20) NOT NULL CHECK (technology IN ('FDM', 'SLA', 'SLS', 'DLP', 'MJ', 'PolyJet')),
    
    -- Build volume (in mm)
    build_volume_x_mm NUMERIC(10, 2) NOT NULL,
    build_volume_y_mm NUMERIC(10, 2) NOT NULL,
    build_volume_z_mm NUMERIC(10, 2) NOT NULL,
    
    -- Nozzle/laser specifications
    nozzle_diameter_mm NUMERIC(5, 3), -- For FDM
    laser_wavelength_nm INTEGER, -- For SLA/DLP
    layer_resolution_min_mm NUMERIC(5, 3),
    layer_resolution_max_mm NUMERIC(5, 3),
    
    -- Performance
    max_speed_mm_per_min NUMERIC(10, 2),
    typical_speed_mm_per_min NUMERIC(10, 2),
    
    -- Materials supported (JSON array of material IDs or names)
    supported_materials JSONB DEFAULT '[]'::jsonb,
    
    -- Status and availability
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'offline', 'retired')),
    location VARCHAR(255), -- Physical location in shop
    notes TEXT,
    
    -- Audit fields
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_printers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_printers_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT uk_printers_shop_serial UNIQUE (shop_id, serial_number)
);

-- Indexes for efficient queries
CREATE INDEX idx_printers_tenant ON printers(tenant_id);
CREATE INDEX idx_printers_shop ON printers(shop_id);
CREATE INDEX idx_printers_status ON printers(status);
CREATE INDEX idx_printers_technology ON printers(technology);
CREATE INDEX idx_printers_created_at ON printers(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_printers_shop_status ON printers(shop_id, status);

-- Printer profiles for different materials/settings
CREATE TABLE IF NOT EXISTS printer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_id UUID NOT NULL,
    
    -- Profile identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    material_type VARCHAR(50) NOT NULL, -- PLA, ABS, PETG, Resin, etc.
    
    -- Print settings
    layer_height_mm NUMERIC(5, 3) NOT NULL,
    infill_percentage INTEGER NOT NULL CHECK (infill_percentage BETWEEN 0 AND 100),
    wall_count INTEGER,
    top_layers INTEGER,
    bottom_layers INTEGER,
    
    -- Temperature settings
    nozzle_temperature_celsius INTEGER,
    bed_temperature_celsius INTEGER,
    chamber_temperature_celsius INTEGER,
    
    -- Speed settings
    print_speed_mm_per_min NUMERIC(10, 2),
    travel_speed_mm_per_min NUMERIC(10, 2),
    retraction_distance_mm NUMERIC(5, 2),
    retraction_speed_mm_per_min NUMERIC(10, 2),
    
    -- Quality settings
    support_enabled BOOLEAN DEFAULT false,
    support_type VARCHAR(50),
    support_density_percentage INTEGER,
    support_angle_degrees NUMERIC(5, 2),
    
    -- Post-processing
    post_process_steps JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_printer_profiles_printer FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE,
    CONSTRAINT uk_printer_profiles_printer_material UNIQUE (printer_id, material_type)
);

CREATE INDEX idx_printer_profiles_printer ON printer_profiles(printer_id);
CREATE INDEX idx_printer_profiles_material ON printer_profiles(material_type);
CREATE INDEX idx_printer_profiles_active ON printer_profiles(is_active) WHERE is_active = true;

-- Printer capabilities
CREATE TABLE IF NOT EXISTS printer_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_id UUID NOT NULL,
    
    -- Capability type
    capability_type VARCHAR(50) NOT NULL, -- dual_extrusion, heated_chamber, enclosure, auto_leveling, etc.
    capability_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Capability details
    is_supported BOOLEAN NOT NULL,
    specifications JSONB, -- Additional capability-specific data
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_printer_capabilities_printer FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE,
    CONSTRAINT uk_printer_capabilities_printer_type UNIQUE (printer_id, capability_type)
);

CREATE INDEX idx_printer_capabilities_printer ON printer_capabilities(printer_id);
CREATE INDEX idx_printer_capabilities_type ON printer_capabilities(capability_type);

-- Function to update updated_at timestamp for printers
CREATE OR REPLACE FUNCTION update_printers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at for printers
CREATE TRIGGER trigger_update_printers_updated_at
    BEFORE UPDATE ON printers
    FOR EACH ROW
    EXECUTE FUNCTION update_printers_updated_at();

-- Function to update updated_at timestamp for printer_profiles
CREATE OR REPLACE FUNCTION update_printer_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at for printer_profiles
CREATE TRIGGER trigger_update_printer_profiles_updated_at
    BEFORE UPDATE ON printer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_printer_profiles_updated_at();
