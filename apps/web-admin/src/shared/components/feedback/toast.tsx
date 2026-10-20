import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const ICONS = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info };
const TONES: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-primary',
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
      className="flex w-[22rem] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border border-border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-popover"
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONES[type])} aria-hidden="true" />
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-0.5 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
