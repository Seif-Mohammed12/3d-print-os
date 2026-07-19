import { TrendingUp, Users, Package, DollarSign } from 'lucide-react';

import { useAnalyticsStats } from '../hooks/use-analytics';

export function AnalyticsDashboard() {
  const { data: stats, isLoading } = useAnalyticsStats();

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                ${stats ? (stats.total_revenue / 100).toFixed(2) : '0.00'}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {stats ? stats.total_orders : 0} orders
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Customers</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {stats ? stats.active_customers : 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Total customers
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {stats ? stats.pending_orders : 0}
              </p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {stats ? stats.completed_orders : 0} completed
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                ${stats ? (stats.average_order_value / 100).toFixed(2) : '0.00'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Per order
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">Revenue Trend</h3>
          <p className="mt-2 text-sm text-muted-foreground">Revenue chart coming soon</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">Order Volume</h3>
          <p className="mt-2 text-sm text-muted-foreground">Order volume chart coming soon</p>
        </div>
      </div>
    </div>
  );
}
