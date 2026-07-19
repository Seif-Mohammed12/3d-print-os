export function ConfigMaterialsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Materials Configuration</h1>
        <p className="text-muted-foreground">Manage material database and properties</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No materials configured</p>
      </div>
    </div>
  );
}
