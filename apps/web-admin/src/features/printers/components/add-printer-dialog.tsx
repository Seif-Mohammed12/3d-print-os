import { useState } from 'react';
import { Dialog } from '../../../shared/components/dialog';
import { useCreatePrinter } from '../hooks/use-printers';

export function AddPrinterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [buildVolumeX, setBuildVolumeX] = useState('');
  const [buildVolumeY, setBuildVolumeY] = useState('');
  const [buildVolumeZ, setBuildVolumeZ] = useState('');
  const [technology, setTechnology] = useState('FDM');
  const [notes, setNotes] = useState('');

  const createPrinter = useCreatePrinter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPrinter.mutateAsync({
        name,
        model,
        manufacturer,
        build_volume_x: parseFloat(buildVolumeX),
        build_volume_y: parseFloat(buildVolumeY),
        build_volume_z: parseFloat(buildVolumeZ),
        technology: technology as 'FDM' | 'SLA' | 'SLS' | 'DLP' | 'MJ',
        notes,
      });
      onClose();
      // Reset form
      setName('');
      setModel('');
      setManufacturer('');
      setBuildVolumeX('');
      setBuildVolumeY('');
      setBuildVolumeZ('');
      setTechnology('FDM');
      setNotes('');
    } catch (error) {
      console.error('Failed to create printer:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add Printer">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="model" className="block text-sm font-medium mb-1">
            Model *
          </label>
          <input
            id="model"
            type="text"
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="manufacturer" className="block text-sm font-medium mb-1">
            Manufacturer *
          </label>
          <input
            id="manufacturer"
            type="text"
            required
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="technology" className="block text-sm font-medium mb-1">
            Technology *
          </label>
          <select
            id="technology"
            required
            value={technology}
            onChange={(e) => setTechnology(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="FDM">FDM</option>
            <option value="SLA">SLA</option>
            <option value="SLS">SLS</option>
            <option value="DLP">DLP</option>
            <option value="MJ">MJ</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="buildVolumeX" className="block text-sm font-medium mb-1">
              Build X (mm) *
            </label>
            <input
              id="buildVolumeX"
              type="number"
              required
              min="0"
              step="0.1"
              value={buildVolumeX}
              onChange={(e) => setBuildVolumeX(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="buildVolumeY" className="block text-sm font-medium mb-1">
              Build Y (mm) *
            </label>
            <input
              id="buildVolumeY"
              type="number"
              required
              min="0"
              step="0.1"
              value={buildVolumeY}
              onChange={(e) => setBuildVolumeY(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="buildVolumeZ" className="block text-sm font-medium mb-1">
              Build Z (mm) *
            </label>
            <input
              id="buildVolumeZ"
              type="number"
              required
              min="0"
              step="0.1"
              value={buildVolumeZ}
              onChange={(e) => setBuildVolumeZ(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
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
            disabled={createPrinter.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createPrinter.isPending ? 'Creating...' : 'Create Printer'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
