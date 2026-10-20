-- 013_print_outcomes.sql
-- Actual print time and filament recorded by staff when an order's production completes,
-- next to the raw slicer estimate it was quoted from. Per-printer (and per-material)
-- correction factors for future quotes are computed from these rows; see docs/QUOTING.md.
--
-- training_samples (008) is not reused: it requires a model file and the full ML feature
-- set, and has no estimated filament, material or slicer version. Recording an outcome
-- still copies the actuals onto any training_samples row for the same quote.

CREATE TABLE IF NOT EXISTS print_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  -- The printer and material the quote was sliced for; factors are keyed on these.
  printer_id uuid NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  -- Where it actually ran, if staff moved it. Samples on another printer are not used.
  printed_on_printer_id uuid REFERENCES printers(id) ON DELETE SET NULL,
  slicer_version varchar(50),

  -- Raw slicer output (slice_result.estimate), never the calibrated value.
  estimated_print_time_s numeric(12, 2) NOT NULL CHECK (estimated_print_time_s > 0),
  estimated_filament_g numeric(12, 2) NOT NULL CHECK (estimated_filament_g > 0),

  -- Printer-reported print duration (excludes heat-up, which job_overhead_minutes covers).
  actual_print_minutes numeric(10, 2) CHECK (actual_print_minutes IS NULL OR actual_print_minutes > 0),
  actual_filament_g numeric(12, 2) CHECK (actual_filament_g IS NULL OR actual_filament_g > 0),
  notes text,

  recorded_by uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT print_outcomes_one_per_order UNIQUE (order_id),
  CONSTRAINT print_outcomes_has_actual
    CHECK (actual_print_minutes IS NOT NULL OR actual_filament_g IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS print_outcomes_printer_recent_idx
  ON print_outcomes (tenant_id, printer_id, recorded_at DESC);

ALTER TABLE print_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY print_outcomes_isolation ON print_outcomes
  USING (app_rls_bypass() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_rls_bypass() OR tenant_id = app_current_tenant_id());
