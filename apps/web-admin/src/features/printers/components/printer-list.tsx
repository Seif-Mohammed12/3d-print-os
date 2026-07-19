import { useState } from 'react';
import { Search, Plus, MoreVertical } from 'lucide-react';

import { usePrinters } from '../hooks/use-printers';
import type { Printer } from '../model/printer-types';
import { AddPrinterDialog } from './add-printer-dialog';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  offline: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function PrinterList() {
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data, isLoading, error } = usePrinters({ page, per_page: 10 });

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading printers...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Failed to load printers</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search printers..."
            className="pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Printer
        </button>
      </div>

      <div className="rounded-md border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Model</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Manufacturer
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Technology
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Build Volume
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((printer: Printer) => (
              <tr key={printer.id} className="border-b border-border">
                <td className="px-4 py-3 text-sm text-foreground">{printer.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{printer.model}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{printer.manufacturer}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{printer.technology}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {printer.build_volume_x}×{printer.build_volume_y}×{printer.build_volume_z}mm
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[printer.status]}`}
                  >
                    {printer.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="p-2 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No printers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.meta.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, data.meta.total)} of{' '}
            {data.meta.total} printers
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.meta.total_pages, p + 1))}
              disabled={page === data.meta.total_pages}
              className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <AddPrinterDialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </div>
  );
}
