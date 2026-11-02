import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const ICONS = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info };
// Toasts use the plain signal tones; card stock stays reserved for job status.
const HEADS: Record<ToastType, string> = {
  success: 'bg-success',
  error: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-foreground',
};

export function Toast({
  message,
  type = 'info',
  onClose,
}: {
  message: string;
  type?: ToastType;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, type === 'error' ? 8000 : 4000);
    return () => clearTimeout(timer);
  }, [onClose, type]);

  const Icon = ICONS[type];
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className="w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-sm border border-stock-edge bg-popover text-sm text-popover-foreground shadow-popover"
    >
      <div aria-hidden="true" className={cn('h-1.5', HEADS[type])} />
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
        <p className="flex-1">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="-m-1.5 rounded-sm p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
