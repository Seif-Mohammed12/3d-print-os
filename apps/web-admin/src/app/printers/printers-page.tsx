import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, Printer as PrinterIcon } from 'lucide-react';

import { PrinterDialog } from '../../features/printers/components/printer-dialogs';
import { usePrinterCalibration, usePrinters } from '../../features/printers/hooks/use-printers';
import { PrinterStatusBadge } from '../../features/printers/components/printer-status-badge';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { formatNumber } from '../../shared/lib/format';
import { Button, Card, EmptyState, ErrorNotice, PageHeader, Skeleton } from '../../shared/ui';

export function PrintersPage() {
  const printers = usePrinters();
  const calibration = usePrinterCalibration();
  const [adding, setAdding] = useState(false);
  const rows = printers.data?.data ?? [];
  const factors = new Map((calibration.data?.data ?? []).map((c) => [c.printer_id, c]));

  return (
    <>
      <PageHeader
        title="Printers"
        description="Your fleet and the limits the slicer uses to time each print."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add printer
          </Button>
        }
      />

      {printers.error && (
        <ErrorNotice
          className="mb-4"
          message={getErrorMessage(printers.error)}
          onRetry={() => printers.refetch()}
        />
      )}

      {printers.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : printers.error ? null : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={PrinterIcon}
            title="Add your first printer"
            description="Quotes are sliced for a specific printer, so you need at least one."
            action={
              <Button variant="primary" onClick={() => setAdding(true)}>
                Add printer
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((printer) => {
            const factor = factors.get(printer.id)?.print_time;
            const missingLimits = printer.technology === 'FDM' && !printer.max_acceleration_mm_s2;
            return (
              <Link
                key={printer.id}
                to={`/app/printers/${printer.id}`}
                className="group rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground group-hover:text-primary">
                      {printer.name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[printer.manufacturer, printer.model].filter(Boolean).join(' ') ||
                        printer.technology}
                    </p>
                  </div>
                  <PrinterStatusBadge status={printer.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Build volume</dt>
                    <dd className="tabular text-foreground">
                      {[
                        printer.build_volume_x_mm,
                        printer.build_volume_y_mm,
                        printer.build_volume_z_mm,
                      ]
                        .map((v) => formatNumber(v))
                        .join(' × ')}{' '}
                      mm
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Time calibration</dt>
                    <dd className="tabular text-foreground">
                      {factor?.applied
                        ? `×${factor.factor.toFixed(2)}`
                        : `${factor?.sample_count ?? 0} of 5 jobs`}
                    </dd>
                  </div>
                </dl>
                {missingLimits && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    Add firmware limits for accurate times
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <PrinterDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
