import { useState } from 'react';
import { Package, Clock, Printer, Plus, MoreVertical } from 'lucide-react';

interface PrintJob {
  id: string;
  name: string;
  customer: string;
  status: 'queued' | 'printing' | 'post-processing' | 'complete';
  printer?: string;
  estimatedTime: number;
  progress?: number;
}

export function PrintQueuePage() {
  const [jobs] = useState<PrintJob[]>([
    { id: '1', name: 'Custom Bracket', customer: 'John Doe', status: 'queued', estimatedTime: 45 },
    {
      id: '2',
      name: 'Phone Case',
      customer: 'Jane Smith',
      status: 'printing',
      printer: 'Prusa i3 MK3',
      estimatedTime: 30,
      progress: 65,
    },
    {
      id: '3',
      name: 'Gear Assembly',
      customer: 'Tech Corp',
      status: 'post-processing',
      printer: 'Ender 3 V2',
      estimatedTime: 60,
      progress: 100,
    },
    {
      id: '4',
      name: 'Prototype Part',
      customer: 'Startup Inc',
      status: 'complete',
      printer: 'Bambu Lab X1',
      estimatedTime: 90,
      progress: 100,
    },
  ]);

  const columns = [
    { id: 'queued', title: 'Queued', icon: Package },
    { id: 'printing', title: 'Printing', icon: Printer },
    { id: 'post-processing', title: 'Post-Processing', icon: Clock },
    { id: 'complete', title: 'Complete', icon: Package },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Print Queue</h1>
          <p className="text-muted-foreground">Manage your production queue and scheduling</p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Job
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {columns.map((column) => {
          const Icon = column.icon;
          const columnJobs = jobs.filter((job) => job.status === column.id);

          return (
            <div key={column.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border p-4">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{column.title}</h3>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {columnJobs.length}
                </span>
              </div>
              <div className="space-y-3 p-4">
                {columnJobs.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No jobs</p>
                ) : (
                  columnJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-lg border border-border bg-background p-4 hover:border-border/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground text-sm">{job.name}</h4>
                          <p className="text-xs text-muted-foreground">{job.customer}</p>
                        </div>
                        <button className="p-1 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                      {job.printer && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <Printer className="h-3 w-3" />
                          {job.printer}
                        </div>
                      )}
                      {job.progress !== undefined && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">{job.progress}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3" />
                        {job.estimatedTime} min
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
