import { useState } from 'react';
import {
  Printer,
  Activity,
  Thermometer,
  Clock,
  AlertCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';

interface PrinterStatus {
  id: string;
  name: string;
  model: string;
  status: 'active' | 'idle' | 'maintenance' | 'offline';
  currentJob?: string;
  progress?: number;
  temperature: number;
  utilization: number;
  uptime: string;
}

export function PrinterFleetPage() {
  const [printers] = useState<PrinterStatus[]>([
    {
      id: '1',
      name: 'Prusa i3 MK3',
      model: 'Prusa i3 MK3S+',
      status: 'active',
      currentJob: 'Phone Case',
      progress: 65,
      temperature: 210,
      utilization: 85,
      uptime: '12h 34m',
    },
    {
      id: '2',
      name: 'Ender 3 V2',
      model: 'Ender 3 V2',
      status: 'idle',
      temperature: 25,
      utilization: 45,
      uptime: '8h 12m',
    },
    {
      id: '3',
      name: 'Bambu Lab X1',
      model: 'Bambu Lab X1 Carbon',
      status: 'active',
      currentJob: 'Gear Assembly',
      progress: 100,
      temperature: 220,
      utilization: 92,
      uptime: '24h 5m',
    },
    {
      id: '4',
      name: 'Prusa Mini',
      model: 'Prusa MINI+',
      status: 'maintenance',
      temperature: 25,
      utilization: 0,
      uptime: '0h 0m',
    },
  ]);

  const statusConfig: Record<string, { color: string; label: string; icon: LucideIcon }> = {
    active: {
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      label: 'Active',
      icon: Activity,
    },
    idle: {
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      label: 'Idle',
      icon: Clock,
    },
    maintenance: {
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      label: 'Maintenance',
      icon: AlertCircle,
    },
    offline: {
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      label: 'Offline',
      icon: Zap,
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Printer Fleet</h1>
          <p className="text-muted-foreground">Real-time printer status and capacity management</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
            Refresh
          </button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Add Printer
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Active</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {printers.filter((p) => p.status === 'active').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Idle</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {printers.filter((p) => p.status === 'idle').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Maintenance</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {printers.filter((p) => p.status === 'maintenance').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Avg Utilization</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {Math.round(printers.reduce((acc, p) => acc + p.utilization, 0) / printers.length)}%
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {printers.map((printer) => {
          const config = statusConfig[printer.status];
          if (!config) return null;
          const StatusIcon = config.icon;

          return (
            <div key={printer.id} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-3">
                    <Printer className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{printer.name}</h3>
                    <p className="text-sm text-muted-foreground">{printer.model}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.color}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </span>
              </div>

              {printer.currentJob && (
                <div className="mb-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Current Job</span>
                    <span className="text-sm text-muted-foreground">{printer.currentJob}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">{printer.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${printer.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Temperature</p>
                    <p className="text-sm font-medium text-foreground">{printer.temperature}°C</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Utilization</p>
                    <p className="text-sm font-medium text-foreground">{printer.utilization}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                    <p className="text-sm font-medium text-foreground">{printer.uptime}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <button className="flex-1 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent">
                  View Details
                </button>
                <button className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  Control
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
