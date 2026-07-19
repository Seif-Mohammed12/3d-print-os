-- Training data collection for ML models
-- Stores features and labels for price prediction, failure prediction, and material recommendation

-- Training samples table - stores individual training records
CREATE TABLE IF NOT EXISTS training_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    shop_id UUID NOT NULL,
    
    -- Source data references
    quote_id UUID NOT NULL,
    order_id UUID,
    model_file_id UUID NOT NULL,
    
    -- Geometry features
    volume_mm3 NUMERIC(12, 2),
    surface_area_mm2 NUMERIC(12, 2),
    bounding_box_x_mm NUMERIC(8, 2),
    bounding_box_y_mm NUMERIC(8, 2),
    bounding_box_z_mm NUMERIC(8, 2),
    aspect_ratio_x NUMERIC(5, 3),
    aspect_ratio_y NUMERIC(5, 3),
    aspect_ratio_z NUMERIC(5, 3),
    complexity_score NUMERIC(5, 2),
    overhang_percentage NUMERIC(5, 2),
    support_volume_mm3 NUMERIC(12, 2),
    hollow_volume_mm3 NUMERIC(12, 2),
    wall_thickness_mm NUMERIC(5, 2),
    
    -- Print settings features
    layer_height_mm NUMERIC(5, 3),
    infill_percentage INTEGER,
    print_speed_mm_per_s NUMERIC(6, 2),
    nozzle_diameter_mm NUMERIC(4, 2),
    
    -- Material features
    material_type VARCHAR(50),
    material_brand VARCHAR(255),
    material_density_g_per_cm3 NUMERIC(5, 3),
    material_color VARCHAR(100),
    
    -- Printer features
    printer_technology VARCHAR(50),
    printer_build_volume_x_mm NUMERIC(8, 2),
    printer_build_volume_y_mm NUMERIC(8, 2),
    printer_build_volume_z_mm NUMERIC(8, 2),
    printer_nozzle_diameter_mm NUMERIC(4, 2),
    
    -- Quote data (input features)
    quoted_price_cents INTEGER,
    quoted_time_minutes INTEGER,
    quoted_material_cost_cents INTEGER,
    quoted_machine_cost_cents INTEGER,
    
    -- Actual outcomes (labels)
    actual_price_cents INTEGER,
    actual_print_time_minutes INTEGER,
    actual_material_cost_cents INTEGER,
    actual_machine_cost_cents INTEGER,
    actual_electricity_cost_cents INTEGER,
    
    -- Failure information
    did_fail BOOLEAN DEFAULT FALSE,
    failure_type VARCHAR(100),
    failure_reason TEXT,
    failure_stage VARCHAR(50), -- 'printing', 'post_processing', 'quality_check'
    
    -- Customer acceptance
    customer_accepted BOOLEAN,
    customer_rating INTEGER,
    customer_feedback TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_training_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_training_model FOREIGN KEY (model_file_id) REFERENCES model_files(id) ON DELETE CASCADE
);

-- Feature vectors table - stores precomputed feature vectors for ML
CREATE TABLE IF NOT EXISTS feature_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_sample_id UUID NOT NULL,
    
    -- Feature vector (JSON array of normalized features)
    geometry_features JSONB,
    print_settings_features JSONB,
    material_features JSONB,
    printer_features JSONB,
    combined_features JSONB,
    
    -- Feature version for model compatibility
    feature_version VARCHAR(20) DEFAULT '1.0',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_feature_sample FOREIGN KEY (training_sample_id) REFERENCES training_samples(id) ON DELETE CASCADE,
    UNIQUE(training_sample_id, feature_version)
);

-- Dataset exports table - tracks exported datasets
CREATE TABLE IF NOT EXISTS dataset_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    shop_id UUID,
    
    -- Export configuration
    export_type VARCHAR(50) NOT NULL, -- 'price_prediction', 'failure_prediction', 'material_recommendation'
    feature_version VARCHAR(20) DEFAULT '1.0',
    date_range_start TIMESTAMP WITH TIME ZONE,
    date_range_end TIMESTAMP WITH TIME ZONE,
    
    -- Export statistics
    sample_count INTEGER,
    feature_count INTEGER,
    
    -- Export file information
    file_path TEXT,
    file_format VARCHAR(20), -- 'csv', 'json', 'parquet'
    file_size_bytes BIGINT,
    
    -- Export status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    
    -- Metadata
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT fk_export_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_export_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- Model performance tracking table
CREATE TABLE IF NOT EXISTS model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    shop_id UUID,
    
    -- Model information
    model_type VARCHAR(50) NOT NULL, -- 'price_prediction', 'failure_prediction', 'material_recommendation'
    model_version VARCHAR(20) NOT NULL,
    
    -- Performance metrics
    accuracy NUMERIC(5, 4),
    precision NUMERIC(5, 4),
    recall NUMERIC(5, 4),
    f1_score NUMERIC(5, 4),
    mae NUMERIC(12, 2), -- Mean Absolute Error
    rmse NUMERIC(12, 2), -- Root Mean Square Error
    r2_score NUMERIC(5, 4),
    
    -- Training information
    training_samples INTEGER,
    validation_samples INTEGER,
    training_duration_seconds INTEGER,
    
    -- Metadata
    trained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT fk_model_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_model_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- Indexes for training_samples
CREATE INDEX idx_training_samples_tenant ON training_samples(tenant_id);
CREATE INDEX idx_training_samples_shop ON training_samples(shop_id);
CREATE INDEX idx_training_samples_quote ON training_samples(quote_id);
CREATE INDEX idx_training_samples_order ON training_samples(order_id);
CREATE INDEX idx_training_samples_created_at ON training_samples(created_at DESC);
CREATE INDEX idx_training_samples_did_fail ON training_samples(did_fail);
CREATE INDEX idx_training_samples_customer_accepted ON training_samples(customer_accepted);

-- Indexes for feature_vectors
CREATE INDEX idx_feature_vectors_sample ON feature_vectors(training_sample_id);
CREATE INDEX idx_feature_vectors_version ON feature_vectors(feature_version);

-- Indexes for dataset_exports
CREATE INDEX idx_dataset_exports_tenant ON dataset_exports(tenant_id);
CREATE INDEX idx_dataset_exports_shop ON dataset_exports(shop_id);
CREATE INDEX idx_dataset_exports_type ON dataset_exports(export_type);
CREATE INDEX idx_dataset_exports_status ON dataset_exports(status);
CREATE INDEX idx_dataset_exports_created_at ON dataset_exports(created_at DESC);

-- Indexes for model_performance
CREATE INDEX idx_model_performance_tenant ON model_performance(tenant_id);
CREATE INDEX idx_model_performance_shop ON model_performance(shop_id);
CREATE INDEX idx_model_performance_type ON model_performance(model_type);
CREATE INDEX idx_model_performance_version ON model_performance(model_version);
CREATE INDEX idx_model_performance_trained_at ON model_performance(trained_at DESC);

-- Update trigger fo training_samples
CREATE OR REPLACE FUNCTION update_training_samples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_training_samples_updated_at
    BEFORE UPDATE ON training_samples
    FOR EACH ROW
    EXECUTE FUNCTION update_training_samples_updated_at();
