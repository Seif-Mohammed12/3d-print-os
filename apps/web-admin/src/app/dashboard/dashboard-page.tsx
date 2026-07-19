export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your 3D Print OS control center</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Orders</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">0</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Active Quotes</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">0</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Customers</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">0</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Revenue</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">$0.00</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="mt-2 text-sm text-muted-foreground">No recent activity</p>
      </div>
    </div>
  );
}
