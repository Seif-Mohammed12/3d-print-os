import { useState } from 'react';
import { Dialog } from '../../../shared/components/dialog';
import { useCreatePricingRule } from '../hooks/use-pricing';

export function AddPricingRuleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [priority, setPriority] = useState('0');
  const [materialCostPerGram, setMaterialCostPerGram] = useState('0');
  const [materialCostPerMm3, setMaterialCostPerMm3] = useState('0');
  const [machineTimeCostPerMinute, setMachineTimeCostPerMinute] = useState('0');
  const [electricityCostPerHour, setElectricityCostPerHour] = useState('0');
  const [maintenanceCostPerHour, setMaintenanceCostPerHour] = useState('0');
  const [failureRiskPercentage, setFailureRiskPercentage] = useState('0');
  const [postProcessingCostPerHour, setPostProcessingCostPerHour] = useState('0');
  const [minimumPrice, setMinimumPrice] = useState('0');

  const createPricingRule = useCreatePricingRule();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPricingRule.mutateAsync({
        priority: parseInt(priority, 10),
        material_cost_per_gram: parseInt(materialCostPerGram, 10),
        material_cost_per_mm3: parseInt(materialCostPerMm3, 10),
        machine_time_cost_per_minute: parseInt(machineTimeCostPerMinute, 10),
        electricity_cost_per_hour: parseInt(electricityCostPerHour, 10),
        maintenance_cost_per_hour: parseInt(maintenanceCostPerHour, 10),
        failure_risk_percentage: parseInt(failureRiskPercentage, 10),
        post_processing_cost_per_hour: parseInt(postProcessingCostPerHour, 10),
        minimum_price: parseInt(minimumPrice, 10),
      });
      onClose();
      // Reset form
      setPriority('0');
      setMaterialCostPerGram('0');
      setMaterialCostPerMm3('0');
      setMachineTimeCostPerMinute('0');
      setElectricityCostPerHour('0');
      setMaintenanceCostPerHour('0');
      setFailureRiskPercentage('0');
      setPostProcessingCostPerHour('0');
      setMinimumPrice('0');
    } catch (error) {
      console.error('Failed to create pricing rule:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add Pricing Rule">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium mb-1">
              Priority
            </label>
            <input
              id="priority"
              type="number"
              min="0"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="failureRiskPercentage" className="block text-sm font-medium mb-1">
              Failure Risk (%)
            </label>
            <input
              id="failureRiskPercentage"
              type="number"
              min="0"
              max="100"
              value={failureRiskPercentage}
              onChange={(e) => setFailureRiskPercentage(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="materialCostPerGram" className="block text-sm font-medium mb-1">
              Material Cost (cents/gram)
            </label>
            <input
              id="materialCostPerGram"
              type="number"
              min="0"
              value={materialCostPerGram}
              onChange={(e) => setMaterialCostPerGram(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="materialCostPerMm3" className="block text-sm font-medium mb-1">
              Material Cost (cents/mm³)
            </label>
            <input
              id="materialCostPerMm3"
              type="number"
              min="0"
              value={materialCostPerMm3}
              onChange={(e) => setMaterialCostPerMm3(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="machineTimeCostPerMinute" className="block text-sm font-medium mb-1">
              Machine Time (cents/min)
            </label>
            <input
              id="machineTimeCostPerMinute"
              type="number"
              min="0"
              value={machineTimeCostPerMinute}
              onChange={(e) => setMachineTimeCostPerMinute(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="electricityCostPerHour" className="block text-sm font-medium mb-1">
              Electricity (cents/hour)
            </label>
            <input
              id="electricityCostPerHour"
              type="number"
              min="0"
              value={electricityCostPerHour}
              onChange={(e) => setElectricityCostPerHour(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="maintenanceCostPerHour" className="block text-sm font-medium mb-1">
              Maintenance (cents/hour)
            </label>
            <input
              id="maintenanceCostPerHour"
              type="number"
              min="0"
              value={maintenanceCostPerHour}
              onChange={(e) => setMaintenanceCostPerHour(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="postProcessingCostPerHour" className="block text-sm font-medium mb-1">
              Post-Processing (cents/hour)
            </label>
            <input
              id="postProcessingCostPerHour"
              type="number"
              min="0"
              value={postProcessingCostPerHour}
              onChange={(e) => setPostProcessingCostPerHour(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="minimumPrice" className="block text-sm font-medium mb-1">
              Minimum Price (cents)
            </label>
            <input
              id="minimumPrice"
              type="number"
              min="0"
              value={minimumPrice}
              onChange={(e) => setMinimumPrice(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPricingRule.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createPricingRule.isPending ? 'Creating...' : 'Create Rule'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
