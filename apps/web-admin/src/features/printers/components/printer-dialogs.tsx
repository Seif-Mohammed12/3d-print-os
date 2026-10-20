import { useEffect, useState, type FormEvent } from 'react';

import { getErrorMessage } from '../../../shared/api/api-error-handler';
import { Button, Dialog, ErrorNotice, Field, Input, Select, Textarea } from '../../../shared/ui';
import { MATERIAL_TYPES } from '../../materials/model/material-types';
import { useDefaultShopId } from '../../shop/hooks/use-shop';
import { useSavePrinter, useSaveProfile } from '../hooks/use-printers';
import {
  INFILL_PATTERNS,
  PRINTER_STATUS_LABEL,
  type GcodeFlavor,
  type Printer,
  type PrinterProfile,
  type PrinterStatus,
} from '../model/printer-types';

const str = (value: unknown) =>
  value === null || value === undefined ? '' : String(Number(value));
const num = (value: string) => (value.trim() === '' ? undefined : Number(value));

export function PrinterDialog({
  open,
  onClose,
  printer,
}: {
  open: boolean;
  onClose: () => void;
  printer?: Printer;
}) {
  const shopId = useDefaultShopId();
  const save = useSavePrinter(printer?.id);
  const [form, setForm] = useState({
    name: '',
    manufacturer: '',
    model: '',
    x: '',
    y: '',
    z: '',
    nozzle: '0.4',
    flavor: 'klipper' as GcodeFlavor,
    accel: '',
    feedrate: '',
    overhead: '10',
    status: 'active' as PrinterStatus,
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    save.reset();
    setForm({
      name: printer?.name ?? '',
      manufacturer: printer?.manufacturer ?? '',
      model: printer?.model ?? '',
      x: str(printer?.build_volume_x_mm),
      y: str(printer?.build_volume_y_mm),
      z: str(printer?.build_volume_z_mm),
      nozzle: printer ? str(printer.nozzle_diameter_mm) : '0.4',
      flavor: printer?.gcode_flavor ?? 'klipper',
      accel: str(printer?.max_acceleration_mm_s2),
      feedrate: str(printer?.max_feedrate_mm_s),
      overhead: printer ? String(printer.job_overhead_minutes) : '10',
      status: printer?.status ?? 'active',
      location: printer?.location ?? '',
      notes: printer?.notes ?? '',
    });
    // Reset only when the dialog opens or switches printer.
  }, [open, printer]);

  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save.mutateAsync({
      ...(printer ? {} : { shopId, technology: 'FDM' as const }),
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim() || undefined,
      model: form.model.trim() || undefined,
      buildVolumeXMm: num(form.x),
      buildVolumeYMm: num(form.y),
      buildVolumeZMm: num(form.z),
      nozzleDiameterMm: num(form.nozzle),
      gcodeFlavor: form.flavor,
      maxAccelerationMmS2: num(form.accel),
      maxFeedrateMmS: num(form.feedrate),
      jobOverheadMinutes: num(form.overhead),
      status: form.status,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={printer ? 'Edit printer' : 'Add printer'}
      description="Firmware limits drive the slicer's time estimate. Copy them from Klipper's printer.cfg."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="printer-form" loading={save.isPending}>
            {printer ? 'Save changes' : 'Add printer'}
          </Button>
        </>
      }
    >
      <form id="printer-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" className="sm:col-span-3">
            {(p) => (
              <Input
                {...p}
                required
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="K1 Max #1"
              />
            )}
          </Field>
          <Field label="Manufacturer">
            {(p) => (
              <Input
                {...p}
                value={form.manufacturer}
                onChange={(e) => update({ manufacturer: e.target.value })}
                placeholder="Creality"
              />
            )}
          </Field>
          <Field label="Model">
            {(p) => (
              <Input
                {...p}
                value={form.model}
                onChange={(e) => update({ model: e.target.value })}
                placeholder="K1 Max"
              />
            )}
          </Field>
          <Field label="Status">
            {(p) => (
              <Select
                {...p}
                value={form.status}
                onChange={(e) => update({ status: e.target.value as PrinterStatus })}
              >
                {Object.entries(PRINTER_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-foreground">Build volume (mm)</legend>
          <div className="grid grid-cols-3 gap-3">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <Field key={axis} label={axis.toUpperCase()}>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min={1}
                    required
                    value={form[axis]}
                    onChange={(e) => update({ [axis]: e.target.value })}
                  />
                )}
              </Field>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-foreground">Slicer limits</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nozzle (mm)">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  step={0.05}
                  min={0.1}
                  value={form.nozzle}
                  onChange={(e) => update({ nozzle: e.target.value })}
                />
              )}
            </Field>
            <Field label="Firmware">
              {(p) => (
                <Select
                  {...p}
                  value={form.flavor}
                  onChange={(e) => update({ flavor: e.target.value as GcodeFlavor })}
                >
                  <option value="klipper">Klipper</option>
                  <option value="marlin2">Marlin 2</option>
                  <option value="marlin">Marlin (legacy)</option>
                  <option value="reprapfirmware">RepRapFirmware</option>
                </Select>
              )}
            </Field>
            <Field label="Job overhead (min)" hint="Heat-up, probing, removal.">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={0}
                  value={form.overhead}
                  onChange={(e) => update({ overhead: e.target.value })}
                />
              )}
            </Field>
            <Field label="Max acceleration (mm/s²)" hint="Klipper max_accel">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={100}
                  value={form.accel}
                  onChange={(e) => update({ accel: e.target.value })}
                  placeholder="5000"
                />
              )}
            </Field>
            <Field label="Max speed (mm/s)" hint="Klipper max_velocity">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={10}
                  value={form.feedrate}
                  onChange={(e) => update({ feedrate: e.target.value })}
                  placeholder="300"
                />
              )}
            </Field>
            <Field label="Location">
              {(p) => (
                <Input
                  {...p}
                  value={form.location}
                  onChange={(e) => update({ location: e.target.value })}
                  placeholder="Shelf A"
                />
              )}
            </Field>
          </div>
        </fieldset>

        <Field label="Notes">
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              className="min-h-0"
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          )}
        </Field>
        {save.error && <ErrorNotice message={getErrorMessage(save.error)} />}
      </form>
    </Dialog>
  );
}

export function ProfileDialog({
  open,
  onClose,
  printerId,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  printerId: string;
  profile?: PrinterProfile;
}) {
  const save = useSaveProfile(printerId, profile?.id);
  const [form, setForm] = useState({
    name: '',
    materialType: 'PLA',
    layer: '0.2',
    infill: '20',
    pattern: 'grid',
    walls: '2',
    top: '4',
    bottom: '4',
    speed: '',
    travel: '',
    nozzleTemp: '',
    bedTemp: '',
    supportAngle: '50',
    isDefault: false,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    save.reset();
    setForm({
      name: profile?.name ?? '',
      materialType: profile?.material_type ?? 'PLA',
      layer: profile ? str(profile.layer_height_mm) : '0.2',
      infill: profile ? String(profile.infill_percentage) : '20',
      pattern: profile?.infill_pattern ?? 'grid',
      walls:
        profile?.wall_count !== null && profile?.wall_count !== undefined
          ? String(profile.wall_count)
          : '2',
      top:
        profile?.top_layers !== null && profile?.top_layers !== undefined
          ? String(profile.top_layers)
          : '4',
      bottom:
        profile?.bottom_layers !== null && profile?.bottom_layers !== undefined
          ? String(profile.bottom_layers)
          : '4',
      speed: profile?.print_speed_mm_per_min
        ? String(Number(profile.print_speed_mm_per_min) / 60)
        : '',
      travel: profile?.travel_speed_mm_per_min
        ? String(Number(profile.travel_speed_mm_per_min) / 60)
        : '',
      nozzleTemp: str(profile?.nozzle_temperature_celsius),
      bedTemp: str(profile?.bed_temperature_celsius),
      supportAngle: profile?.support_angle_degrees ? str(profile.support_angle_degrees) : '50',
      isDefault: profile?.is_default ?? false,
    });
  }, [open, profile]);

  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const perMinute = (mmPerSecond: string) =>
    mmPerSecond.trim() ? Number(mmPerSecond) * 60 : undefined;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save.mutateAsync({
      name: form.name.trim() || `${form.materialType} ${form.layer} mm`,
      materialType: form.materialType,
      layerHeightMm: Number(form.layer),
      infillPercentage: Number(form.infill),
      infillPattern: form.pattern,
      wallCount: num(form.walls),
      topLayers: num(form.top),
      bottomLayers: num(form.bottom),
      printSpeedMmPerMin: perMinute(form.speed),
      travelSpeedMmPerMin: perMinute(form.travel),
      nozzleTemperatureCelsius: num(form.nozzleTemp),
      bedTemperatureCelsius: num(form.bedTemp),
      supportAngleDegrees: num(form.supportAngle),
      isDefault: form.isDefault,
      isActive: true,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={profile ? 'Edit profile' : 'Add profile'}
      description="The settings you really print this material with on this printer."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="profile-form" loading={save.isPending}>
            {profile ? 'Save changes' : 'Add profile'}
          </Button>
        </>
      }
    >
      <form id="profile-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <Field label="Material type">
          {(p) => (
            <Select
              {...p}
              value={form.materialType}
              onChange={(e) => update({ materialType: e.target.value })}
            >
              {MATERIAL_TYPES.filter((type) => type !== 'Resin').map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Name" className="sm:col-span-2">
          {(p) => (
            <Input
              {...p}
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder={`${form.materialType} ${form.layer} mm`}
            />
          )}
        </Field>
        <Field label="Layer height (mm)">
          {(p) => (
            <Input
              {...p}
              type="number"
              step={0.02}
              min={0.05}
              max={1}
              required
              value={form.layer}
              onChange={(e) => update({ layer: e.target.value })}
            />
          )}
        </Field>
        <Field label="Infill %">
          {(p) => (
            <Input
              {...p}
              type="number"
              min={0}
              max={100}
              required
              value={form.infill}
              onChange={(e) => update({ infill: e.target.value })}
            />
          )}
        </Field>
        <Field label="Infill pattern">
          {(p) => (
            <Select
              {...p}
              value={form.pattern}
              onChange={(e) => update({ pattern: e.target.value })}
            >
              {INFILL_PATTERNS.map((pattern) => (
                <option key={pattern} value={pattern}>
                  {pattern}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Walls">
          {(p) => (
            <Input
              {...p}
              type="number"
              min={1}
              max={30}
              value={form.walls}
              onChange={(e) => update({ walls: e.target.value })}
            />
          )}
        </Field>
        <Field label="Top layers">
          {(p) => (
            <Input
              {...p}
              type="number"
              min={0}
              value={form.top}
              onChange={(e) => update({ top: e.target.value })}
            />
          )}
        </Field>
        <Field label="Bottom layers">
          {(p) => (
            <Input
              {...p}
              type="number"
              min={0}
              value={form.bottom}
              onChange={(e) => update({ bottom: e.target.value })}
            />
          )}
        </Field>
        <Field label="Print speed (mm/s)" hint="Walls, infill and supports.">
          {(p) => (
            <Input
              {...p}
              type="number"
              min={1}
              value={form.speed}
              onChange={(e) => update({ speed: e.target.value })}
              placeholder="100"
            />
          )}
        </Field>
        <Field label="Travel speed (mm/s)">
          {(p) => (
            <Input
              {...p}
              type="number"
              min={1}
              value={form.travel}
              onChange={(e) => update({ travel: e.target.value })}
              placeholder="250"
            />
          )}
        </Field>
        <Field label="Support angle (°)">
          {(p) => (
            <Input
              {...p}
              type="number"
              min={0}
              max={90}
              value={form.supportAngle}
              onChange={(e) => update({ supportAngle: e.target.value })}
            />
          )}
        </Field>
        <Field label="Nozzle temp (°C)">
          {(p) => (
            <Input
              {...p}
              type="number"
              min={150}
              max={500}
              value={form.nozzleTemp}
              onChange={(e) => update({ nozzleTemp: e.target.value })}
            />
          )}
        </Field>
        <Field label="Bed temp (°C)">
          {(p) => (
            <Input
              {...p}
              type="number"
              min={0}
              max={150}
              value={form.bedTemp}
              onChange={(e) => update({ bedTemp: e.target.value })}
            />
          )}
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => update({ isDefault: e.target.checked })}
            className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
          />
          Default profile
        </label>
        {save.error && (
          <div className="sm:col-span-3">
            <ErrorNotice message={getErrorMessage(save.error)} />
          </div>
        )}
      </form>
    </Dialog>
  );
}
