export function ConfigPricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pricing Rules Configuration</h1>
        <p className="text-muted-foreground">Configure pricing policies and cost factors</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No pricing rules configured</p>
      </div>
    </div>
  );
}
