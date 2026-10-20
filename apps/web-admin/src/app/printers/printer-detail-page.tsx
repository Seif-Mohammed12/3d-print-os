import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Layers, Plus } from 'lucide-react';

import { PrinterDialog, ProfileDialog } from '../../features/printers/components/printer-dialogs';
import {
  usePrinter,
  usePrinterCalibration,
  usePrinterProfiles,
} from '../../features/printers/hooks/use-printers';
import { PrinterStatusBadge } from '../../features/printers/components/printer-status-badge';
import type {
  CalibrationFactor,
  PrinterProfile,
} from '../../features/printers/model/printer-types';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { formatNumber } from '../../shared/lib/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  DetailList,
  EmptyState,
  ErrorNotice,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../shared/ui';

function factorText(factor: CalibrationFactor | undefined, minSamples = 5) {
  if (!factor) {
    return '—';
  }
  return factor.applied
    ? `×${factor.factor.toFixed(2)} · ${factor.sample_count} jobs`
    : `Learning · ${factor.sample_count} of ${minSamples} jobs`;
}

export function PrinterDetailPage() {
  const { id = '' } = useParams();
  const printer = usePrinter(id);
  const profiles = usePrinterProfiles(id);
  const calibration = usePrinterCalibration(id);
  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState<PrinterProfile | undefined>();
  const [profileOpen, setProfileOpen] = useState(false);

  if (printer.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (printer.error || !printer.data) {
    return (
      <ErrorNotice
        message={printer.error ? getErrorMessage(printer.error) : 'Printer not found.'}
      />
    );
  }

  const p = printer.data;
  const cal = calibration.data?.data[0];
  const openProfile = (next?: PrinterProfile) => {
    setProfile(next);
    setProfileOpen(true);
  };

  return (
    <>
      <Link
        to="/app/printers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Printers
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{p.name}</h1>
            <PrinterStatusBadge status={p.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[p.manufacturer, p.model].filter(Boolean).join(' ') || p.technology}
            {p.location ? ` · ${p.location}` : ''}
          </p>
        </div>
        <Button onClick={() => setEditOpen(true)}>Edit printer</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader
            title="Print profiles"
            description="One per material type. Quotes use the matching profile's settings."
            action={
              <Button size="sm" onClick={() => openProfile()}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            }
          />
          {(profiles.data ?? []).length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No profiles yet"
              description="Without a profile, quotes use generic settings and are less accurate."
              action={
                <Button variant="primary" onClick={() => openProfile()}>
                  Add profile
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Profile</TH>
                  <TH>Material</TH>
                  <TH className="hidden sm:table-cell">Layer</TH>
                  <TH className="hidden sm:table-cell">Infill</TH>
                  <TH className="hidden md:table-cell">Speed</TH>
                </tr>
              </THead>
              <TBody>
                {(profiles.data ?? []).map((row) => (
                  <TR key={row.id} onClick={() => openProfile(row)}>
                    <TD className="font-medium">
                      {row.name}{' '}
                      {row.is_default && (
                        <Badge tone="accent" className="ms-1">
                          Default
                        </Badge>
                      )}
                    </TD>
                    <TD>{row.material_type}</TD>
                    <TD className="tabular hidden sm:table-cell">
                      {formatNumber(row.layer_height_mm, 2)} mm
                    </TD>
                    <TD className="tabular hidden sm:table-cell">
                      {row.infill_percentage}% {row.infill_pattern ?? ''}
                    </TD>
                    <TD className="tabular hidden md:table-cell">
                      {row.print_speed_mm_per_min
                        ? `${formatNumber(Number(row.print_speed_mm_per_min) / 60)} mm/s`
                        : '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Slicer limits" />
            <CardContent>
              <DetailList
                items={[
                  {
                    label: 'Build volume',
                    value: `${[p.build_volume_x_mm, p.build_volume_y_mm, p.build_volume_z_mm].map((v) => formatNumber(v)).join(' × ')} mm`,
                  },
                  {
                    label: 'Nozzle',
                    value: p.nozzle_diameter_mm
                      ? `${formatNumber(p.nozzle_diameter_mm, 2)} mm`
                      : '—',
                  },
                  { label: 'Firmware', value: p.gcode_flavor },
                  {
                    label: 'Max acceleration',
                    value: p.max_acceleration_mm_s2
                      ? `${formatNumber(p.max_acceleration_mm_s2)} mm/s²`
                      : 'Not set',
                  },
                  {
                    label: 'Max speed',
                    value: p.max_feedrate_mm_s
                      ? `${formatNumber(p.max_feedrate_mm_s)} mm/s`
                      : 'Not set',
                  },
                  { label: 'Job overhead', value: `${p.job_overhead_minutes} min` },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Calibration" description="Learned from recorded print results." />
            <CardContent className="space-y-4">
              <DetailList
                items={[
                  { label: 'Print time', value: factorText(cal?.print_time) },
                  { label: 'Filament', value: factorText(cal?.filament) },
                ]}
              />
              {(cal?.materials ?? []).length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">By material</p>
                  <DetailList
                    items={(cal?.materials ?? []).map((m) => ({
                      label: m.material_name ?? 'Material',
                      value: factorText(m.print_time),
                    }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PrinterDialog open={editOpen} onClose={() => setEditOpen(false)} printer={p} />
      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        printerId={p.id}
        profile={profile}
      />
    </>
  );
}
