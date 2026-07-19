export function JobHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Job History</h1>
        <p className="text-muted-foreground">View completed prints and performance metrics</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No job history</p>
      </div>
    </div>
  );
}
