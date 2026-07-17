-- 0002_model_files.sql
-- STL / model file metadata (no geometry analysis yet)

CREATE TABLE model_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  shop_id uuid REFERENCES shops (id) ON DELETE SET NULL,
  original_filename text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  content_type text NOT NULL,
  storage_bucket text NOT NULL,
  storage_key text NOT NULL,
  checksum_sha256 text,
  status text NOT NULL DEFAULT 'pending_upload'
    CHECK (status IN ('pending_upload', 'uploaded', 'failed', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, storage_key)
);

CREATE INDEX model_files_tenant_id_idx ON model_files (tenant_id);
CREATE INDEX model_files_uploaded_by_user_id_idx ON model_files (uploaded_by_user_id);
CREATE INDEX model_files_status_idx ON model_files (tenant_id, status);

ALTER TABLE model_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY model_files_isolation ON model_files
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());

-- Permissions for uploads
INSERT INTO permissions (code, description, module) VALUES
  ('models:read', 'View uploaded models', 'geometry'),
  ('models:write', 'Upload and delete models', 'geometry')
ON CONFLICT (code) DO NOTHING;

-- Grant to existing system roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.code IN ('models:read', 'models:write')
  AND r.code IN ('owner', 'admin', 'employee', 'customer')
ON CONFLICT DO NOTHING;

-- Private storage bucket (Supabase Storage) — safe to skip if unavailable
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'model-files',
    'model-files',
    false,
    52428800,
    ARRAY[
      'model/stl',
      'application/sla',
      'application/vnd.ms-pki.stl',
      'application/octet-stream'
    ]
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'storage.buckets missing — create private bucket model-files in Supabase dashboard';
  WHEN OTHERS THEN
    RAISE NOTICE 'storage bucket seed skipped: %', SQLERRM;
END $$;
