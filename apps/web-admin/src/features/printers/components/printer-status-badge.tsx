import { Badge, type BadgeTone } from '../../../shared/ui';
import { PRINTER_STATUS_LABEL, type PrinterStatus } from '../model/printer-types';

const TONE: Record<PrinterStatus, BadgeTone> = {
  active: 'success',
  maintenance: 'warning',
  offline: 'neutral',
  retired: 'neutral',
};

export function PrinterStatusBadge({ status }: { status: PrinterStatus }) {
  return <Badge tone={TONE[status]}>{PRINTER_STATUS_LABEL[status]}</Badge>;
}
