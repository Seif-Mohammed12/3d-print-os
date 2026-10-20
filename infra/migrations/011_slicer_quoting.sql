-- 011_slicer_quoting.sql
-- Slicer-accurate quoting: machine limits that drive slicer time estimates,
-- per-tenant tax, and the stored slicer result behind every quote price.

-- Printers: firmware limits used by the slicer's time estimator, and per-job overhead
-- (heat-up, bed probing, part removal) that the slicer does not count.
ALTER TABLE printers
  ADD COLUMN IF NOT EXISTS gcode_flavor varchar(20) NOT NULL DEFAULT 'klipper'
    CHECK (gcode_flavor IN ('klipper', 'marlin2', 'marlin', 'reprapfirmware')),
  ADD COLUMN IF NOT EXISTS max_acceleration_mm_s2 numeric(10, 2)
    CHECK (max_acceleration_mm_s2 IS NULL OR max_acceleration_mm_s2 BETWEEN 100 AND 100000),
  ADD COLUMN IF NOT EXISTS max_feedrate_mm_s numeric(10, 2)
    CHECK (max_feedrate_mm_s IS NULL OR max_feedrate_mm_s BETWEEN 10 AND 2000),
  ADD COLUMN IF NOT EXISTS job_overhead_minutes integer NOT NULL DEFAULT 10
    CHECK (job_overhead_minutes BETWEEN 0 AND 600),
  -- Allowlisted PrusaSlicer keys (validated by the geometry service), e.g. jerk, accelerations
  ADD COLUMN IF NOT EXISTS slicer_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE printer_profiles
  ADD COLUMN IF NOT EXISTS infill_pattern varchar(30),
  ADD COLUMN IF NOT EXISTS slicer_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Tax in basis points (1400 = 14%) so money math stays integer.
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS tax_rate_bps integer NOT NULL DEFAULT 0
    CHECK (tax_rate_bps BETWEEN 0 AND 10000);

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS supports_mode varchar(20) NOT NULL DEFAULT 'auto'
    CHECK (supports_mode IN ('auto', 'buildplate_only', 'off')),
  ADD COLUMN IF NOT EXISTS orientation_mode varchar(10) NOT NULL DEFAULT 'auto'
    CHECK (orientation_mode IN ('auto', 'as_is')),
  ADD COLUMN IF NOT EXISTS estimate_source varchar(20)
    CHECK (estimate_source IS NULL OR estimate_source IN ('slicer')),
  -- Full slicer output: per-feature filament, chosen orientation, candidates, slicer version
  ADD COLUMN IF NOT EXISTS slice_result jsonb,
  -- Rates and line items used to price the quote, kept so issued prices are auditable
  ADD COLUMN IF NOT EXISTS pricing_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS analyzed_at timestamptz;
