import { PricingRulesList } from '../../features/pricing/components/pricing-rules-list';

export function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pricing Rules</h1>
        <p className="text-muted-foreground">Configure your pricing policies and rules</p>
      </div>
      <PricingRulesList />
    </div>
  );
}
