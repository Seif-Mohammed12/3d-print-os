import { Lamp, type LampTone } from '../../../shared/ui';
import { PRINTER_STATUS_LABEL, type PrinterStatus } from '../model/printer-types';

const TONE: Record<PrinterStatus, LampTone> = {
  active: 'ready',
  maintenance: 'waiting',
  offline: 'off',
  retired: 'off',
};

export function PrinterStatusBadge({ status }: { status: PrinterStatus }) {
  return <Lamp tone={TONE[status]}>{PRINTER_STATUS_LABEL[status]}</Lamp>;
}
