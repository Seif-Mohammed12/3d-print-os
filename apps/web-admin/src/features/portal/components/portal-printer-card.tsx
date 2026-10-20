import { usePrinters } from '../../printers/hooks/use-printers';
import { getErrorMessage } from '../../../shared/api/api-error-handler';
import { useToast } from '../../../shared/components/feedback/toast-provider';
import {
  Card,
  CardContent,
  CardHeader,
  ErrorNotice,
  Field,
  Select,
  Skeleton,
} from '../../../shared/ui';
import { usePortalSettings, useUpdatePortalSettings } from '../hooks/use-portal';

/** Staff: pick the printer whose slicer settings price customer portal quotes. */
export function PortalPrinterCard() {
  const settings = usePortalSettings();
  const update = useUpdatePortalSettings();
  const printers = usePrinters({ status: 'active' });
  const toast = useToast();
  const quotable = (printers.data?.data ?? []).filter((printer) => printer.technology === 'FDM');

  const change = async (value: string) => {
    try {
      await update.mutateAsync(value || null);
      toast.success('Portal printer saved');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader title="Customer portal" />
      <CardContent>
        {settings.isLoading || printers.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : settings.error ? (
          <ErrorNotice
            message={getErrorMessage(settings.error)}
            onRetry={() => settings.refetch()}
          />
        ) : (
          <Field
            label="Price portal quotes on"
            hint={
              settings.data?.effective_printer
                ? `Customers get instant prices sliced for ${settings.data.effective_printer.name}.`
                : 'Add an active FDM printer to turn on instant portal prices.'
            }
          >
            {(p) => (
              <Select
                {...p}
                value={settings.data?.portal_printer_id ?? ''}
                disabled={update.isPending}
                onChange={(e) => void change(e.target.value)}
              >
                <option value="">Automatic (oldest active FDM printer)</option>
                {quotable.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </CardContent>
    </Card>
  );
}
