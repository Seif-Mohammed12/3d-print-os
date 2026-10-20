# Slicer-accurate quoting

Quote prices come from a real slice, not from volume ratios. `POST /api/v1/quotes/:id/analyze`:

1. Loads the quote's printer, material, the printer profile for that material type, and the most
   specific active pricing rule (shop / material / printer scopes; more scopes win, then `priority`).
2. Mints a 15-minute signed URL for the model and calls the geometry service `POST /api/v1/slice`.
3. The geometry service runs the **PrusaSlicer CLI** with a profile built from those settings. With
   `orientation_mode = auto` it slices the uploaded orientation plus the most stable resting poses
   and keeps the cheapest (time × hourly cost + grams × gram cost + support penalty).
4. Time, grams, layers and per-feature filament (perimeters, infill, support, …) are read from the
   G-code. The API prices it with integer minor units in the tenant's currency and tax rate, and
   stores the full slice and price breakdown on the quote (`slice_result`, `pricing_breakdown`).

Changing a priced quote's printer, material, layer height or infill clears its price; approve
requires a slicer price.

## What the shop must configure

Accuracy depends on these values matching the real machines:

| Where                               | Field                                                             | Why                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Printer                             | `build_volume_*`, `nozzle_diameter_mm`                            | Fit check and line widths                                                                         |
| Printer                             | `max_acceleration_mm_s2`, `max_feedrate_mm_s`                     | **Biggest driver of time accuracy.** Use the Klipper `printer.cfg` `max_accel` / `max_velocity`   |
| Printer                             | `job_overhead_minutes`                                            | Heat-up, probing, part removal (not in the slicer time)                                           |
| Printer profile (per material type) | layer height, walls, top/bottom, infill, speeds, `infill_pattern` | Process settings the shop actually prints with                                                    |
| Printer / profile                   | `slicer_overrides`                                                | Allowlisted PrusaSlicer keys, e.g. `{"slowdown_below_layer_time": 6, "max_volumetric_speed": 15}` |
| Material                            | `density_g_per_cm3`, `price_per_gram_cents`                       | Grams and material cost                                                                           |
| Pricing rule                        | machine/electricity/maintenance rates, failure %, margin, minimum | Price lines                                                                                       |
| `tenant_settings.tax_rate_bps`      | e.g. `1400` for 14% VAT                                           | Tax                                                                                               |

Missing printer limits fall back to defaults and are listed on the quote as `estimate_assumption`
risk factors.

`slicer_overrides` only accepts keys in `ALLOWED_OVERRIDES`
(`apps/geometry-service/app/slicing/config_builder.py`); keys like `post_process` or `start_gcode`
are rejected because they can run commands or inject G-code.

## Calibration against real prints

The slicer's time estimate drifts from real machines (input shaping, pressure advance, firmware
lookahead), so every quote's slicer time and grams are multiplied by per-printer correction factors
learned from finished jobs.

**Recording actuals (staff).** After setting an order's `productionStatus` to `completed`, record
what the job really took:

```http
PUT /api/v1/orders/:orderId/print-outcome
{ "actualPrintMinutes": 134, "actualFilamentGrams": 41.8, "notes": "optional" }
```

Either value may be omitted, but not both. Use the print duration the printer reports (Mainsail /
Fluidd job history "print time"), **without** heat-up and probing — that is covered by
`job_overhead_minutes`. Grams are spool weight before minus after. If the job ran on a different
printer than the one quoted, pass `printedOnPrinterId`; such jobs are kept but not used for
calibration. Sending it again corrects the entry; `GET` the same path to read it back.

Each outcome (`print_outcomes`, migration `013`) snapshots the quote's **raw** slicer estimate
(`slice_result.estimate`), printer, material and slicer version, so factors never feed back on
themselves. Recorded minutes are also copied to `training_samples` for the same quote.

**How factors are computed** (`apps/api/src/quotes/domain/calibration.ts`):

- Ratio per job = actual ÷ raw slicer estimate, separately for time and grams. Ratios outside
  0.25–4 are treated as typos and ignored.
- Factor = median ratio over the last **20** valid jobs, clamped to 0.5–2.0. The median ignores the
  odd failed-and-restarted job, and the window lets it follow a printer as it is re-tuned.
- Until **5** valid jobs exist the factor is **1.0** (no correction).
- A printer + material pair uses its own factor once it has 5 jobs; otherwise the printer-wide
  factor (all materials) applies.

**On the quote.** `analyze` prices the calibrated time and grams (job overhead is added unscaled).
`slice_result` keeps the raw slicer output, and `pricing_breakdown.calibration` records, for both
time and filament, the raw value, the factor, the sample count, the scope (`printer_material`,
`printer` or `none`) and the calibrated value, so an issued price can always be traced back.

**Viewing factors.** `GET /api/v1/calibration/printers` (optional `?printerId=`) lists each FDM
printer's current time and filament factors, sample counts and median ratio, with a per-material
breakdown. A factor far from 1.0 usually means the printer's `max_acceleration_mm_s2` /
`max_feedrate_mm_s` do not match its firmware — fixing those is better than relying on the factor.

## Running locally

The geometry service needs PrusaSlicer (the Docker image installs it). On Windows:

```bash
SLICER_EXECUTABLE="C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe"
```

API env: `GEOMETRY_SERVICE_URL=http://localhost:8000/api/v1`. Geometry service env:
`SLICER_ALLOWED_DOWNLOAD_HOSTS=<project>.supabase.co`.

Tests: `pytest tests/test_slicing.py` (real-slicer tests skip when PrusaSlicer is absent) and
`pnpm vitest run apps/api/src/quotes/domain`.
