import { AnalyticsDashboard } from '../../features/analytics/components/analytics-dashboard';

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Track your business performance</p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
