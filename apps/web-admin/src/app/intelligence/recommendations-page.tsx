export function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Recommendations</h1>
        <p className="text-muted-foreground">Optimization suggestions for your models</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">Upload a model to get recommendations</p>
      </div>
    </div>
  );
}
