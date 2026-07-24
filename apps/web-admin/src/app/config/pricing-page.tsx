import { useState } from 'react';

export function ConfigPricingPage() {
  // Pricing rules state
  const [plaCost, setPlaCost] = useState(() => localStorage.getItem('plaCost') || '2.5');
  const [absCost, setAbsCost] = useState(() => localStorage.getItem('absCost') || '3.0');
  const [petgCost, setPetgCost] = useState(() => localStorage.getItem('petgCost') || '3.5');
  const [tpuCost, setTpuCost] = useState(() => localStorage.getItem('tpuCost') || '4.0');
  const [fdmRate, setFdmRate] = useState(() => localStorage.getItem('fdmRate') || '25');
  const [slaRate, setSlaRate] = useState(() => localStorage.getItem('slaRate') || '75');
  const [electricityRate, setElectricityRate] = useState(
    () => localStorage.getItem('electricityRate') || '25',
  );
  const [maintenanceRate, setMaintenanceRate] = useState(
    () => localStorage.getItem('maintenanceRate') || '50',
  );
  const [postProcessingRate, setPostProcessingRate] = useState(
    () => localStorage.getItem('postProcessingRate') || '500',
  );
  const [taxRate, setTaxRate] = useState(() => localStorage.getItem('taxRate') || '14');
  const [minimumOrder, setMinimumOrder] = useState(
    () => localStorage.getItem('minimumOrder') || '500',
  );

  const savePricingRules = () => {
    localStorage.setItem('plaCost', plaCost);
    localStorage.setItem('absCost', absCost);
    localStorage.setItem('petgCost', petgCost);
    localStorage.setItem('tpuCost', tpuCost);
    localStorage.setItem('fdmRate', fdmRate);
    localStorage.setItem('slaRate', slaRate);
    localStorage.setItem('electricityRate', electricityRate);
    localStorage.setItem('maintenanceRate', maintenanceRate);
    localStorage.setItem('postProcessingRate', postProcessingRate);
    localStorage.setItem('taxRate', taxRate);
    localStorage.setItem('minimumOrder', minimumOrder);
    alert('Pricing rules saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pricing Rules Configuration</h1>
        <p className="text-muted-foreground">Configure pricing policies and cost factors</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Pricing Rules</h3>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Material Costs (EGP/gram)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plaCost" className="block text-sm font-medium mb-2">
                PLA
              </label>
              <input
                id="plaCost"
                type="number"
                min="0"
                step="0.1"
                value={plaCost}
                onChange={(e) => setPlaCost(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="absCost" className="block text-sm font-medium mb-2">
                ABS
              </label>
              <input
                id="absCost"
                type="number"
                min="0"
                step="0.1"
                value={absCost}
                onChange={(e) => setAbsCost(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="petgCost" className="block text-sm font-medium mb-2">
                PETG
              </label>
              <input
                id="petgCost"
                type="number"
                min="0"
                step="0.1"
                value={petgCost}
                onChange={(e) => setPetgCost(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="tpuCost" className="block text-sm font-medium mb-2">
                TPU
              </label>
              <input
                id="tpuCost"
                type="number"
                min="0"
                step="0.1"
                value={tpuCost}
                onChange={(e) => setTpuCost(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <h4 className="text-sm font-medium text-foreground mt-4">
            Printer Hourly Rates (EGP/hr)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="fdmRate" className="block text-sm font-medium mb-2">
                FDM
              </label>
              <input
                id="fdmRate"
                type="number"
                min="0"
                step="1"
                value={fdmRate}
                onChange={(e) => setFdmRate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="slaRate" className="block text-sm font-medium mb-2">
                SLA
              </label>
              <input
                id="slaRate"
                type="number"
                min="0"
                step="1"
                value={slaRate}
                onChange={(e) => setSlaRate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <h4 className="text-sm font-medium text-foreground mt-4">Other Costs (EGP)</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="electricityRate" className="block text-sm font-medium mb-2">
                Electricity/hr
              </label>
              <input
                id="electricityRate"
                type="number"
                min="0"
                step="1"
                value={electricityRate}
                onChange={(e) => setElectricityRate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="maintenanceRate" className="block text-sm font-medium mb-2">
                Maintenance/hr
              </label>
              <input
                id="maintenanceRate"
                type="number"
                min="0"
                step="1"
                value={maintenanceRate}
                onChange={(e) => setMaintenanceRate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="postProcessingRate" className="block text-sm font-medium mb-2">
                Post-Processing (fixed EGP)
              </label>
              <input
                id="postProcessingRate"
                type="number"
                min="0"
                step="1"
                value={postProcessingRate}
                onChange={(e) => setPostProcessingRate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <h4 className="text-sm font-medium text-foreground mt-4">Tax & Minimums</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="taxRate" className="block text-sm font-medium mb-2">
                Tax Rate (%)
              </label>
              <input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="minimumOrder" className="block text-sm font-medium mb-2">
                Minimum Order (EGP)
              </label>
              <input
                id="minimumOrder"
                type="number"
                min="0"
                step="1"
                value={minimumOrder}
                onChange={(e) => setMinimumOrder(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={savePricingRules}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save Pricing Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
