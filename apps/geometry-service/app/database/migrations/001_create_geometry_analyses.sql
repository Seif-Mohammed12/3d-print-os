-- Create geometry_analyses table
-- This table stores analysis results for uploaded STL files

CREATE TABLE IF NOT EXISTS geometry_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_file_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    storage_key TEXT NOT NULL,
    storage_bucket TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Analysis results (JSONB for flexibility)
    metrics JSONB,
    quality JSONB,
    complexity JSONB,
    
    -- Error handling
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT fk_model_file 
        FOREIGN KEY (model_file_id) 
        REFERENCES model_files(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT valid_status 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_geometry_analyses_model_file 
    ON geometry_analyses(model_file_id);

CREATE INDEX IF NOT EXISTS idx_geometry_analyses_tenant 
    ON geometry_analyses(tenant_id);

CREATE INDEX IF NOT EXISTS idx_geometry_analyses_status 
    ON geometry_analyses(status);

CREATE INDEX IF NOT EXISTS idx_geometry_analyses_created_at 
    ON geometry_analyses(created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_geometry_analyses_metrics 
    ON geometry_analyses USING GIN (metrics);

CREATE INDEX IF NOT EXISTS idx_geometry_analyses_quality 
    ON geometry_analyses USING GIN (quality);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_geometry_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_geometry_analyses_updated_at
    BEFORE UPDATE ON geometry_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_geometry_analyses_updated_at();

-- Row Level Security (RLS) for multi-tenancy
ALTER TABLE geometry_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access analyses for their tenant
CREATE POLICY geometry_analyses_tenant_isolation ON geometry_analyses
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Policy: Service role can bypass RLS (for background jobs)
CREATE POLICY geometry_analyses_service_role ON geometry_analyses
    FOR ALL
    TO service_role
    USING (true);
