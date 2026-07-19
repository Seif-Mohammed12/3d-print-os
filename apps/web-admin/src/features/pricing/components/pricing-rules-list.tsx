import { useState } from 'react';
import { Search, Plus, MoreVertical } from 'lucide-react';

import { usePricingRules } from '../hooks/use-pricing';
import type { PricingRule } from '../model/pricing-types';

export function PricingRulesList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = usePricingRules({ page, per_page: 10 });

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading pricing rules...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Failed to load pricing rules</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search rules..."
            className="pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      <div className="rounded-md border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Material Cost</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Machine Time</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Failure Risk</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Min Price</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((rule: PricingRule) => (
              <tr key={rule.id} className="border-b border-border">
                <td className="px-4 py-3 text-sm text-foreground">{rule.priority}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">${rule.material_cost_per_gram / 100}/g</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">${rule.machine_time_cost_per_minute / 100}/min</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{rule.failure_risk_percentage}%</td>
                <td className="px-4 py-3 text-sm text-foreground">${rule.minimum_price / 100}</td>
                <td className="px-4 py-3 text-right">
                  <button className="p-2 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No pricing rules found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.meta.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, data.meta.total)} of {data.meta.total} rules
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
    </div>
  );
}
