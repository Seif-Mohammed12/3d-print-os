import { useState } from 'react';
import { Package, AlertTriangle, Plus, MoreVertical } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  type: string;
  color: string;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  costPerUnit: number;
  lastRestocked: string;
}

export function MaterialInventoryPage() {
  const [materials] = useState<Material[]>([
    {
      id: '1',
      name: 'PLA White',
      type: 'PLA',
      color: 'White',
      stock: 2500,
      unit: 'g',
      lowStockThreshold: 500,
      costPerUnit: 0.05,
      lastRestocked: '2024-01-15',
    },
    {
      id: '2',
      name: 'ABS Black',
      type: 'ABS',
      color: 'Black',
      stock: 1800,
      unit: 'g',
      lowStockThreshold: 500,
      costPerUnit: 0.06,
      lastRestocked: '2024-01-10',
    },
    {
      id: '3',
      name: 'PETG Blue',
      type: 'PETG',
      color: 'Blue',
      stock: 320,
      unit: 'g',
      lowStockThreshold: 500,
      costPerUnit: 0.07,
      lastRestocked: '2024-01-05',
    },
    {
      id: '4',
      name: 'TPU Red',
      type: 'TPU',
      color: 'Red',
      stock: 1200,
      unit: 'g',
      lowStockThreshold: 300,
      costPerUnit: 0.08,
      lastRestocked: '2024-01-12',
    },
  ]);

  const lowStockItems = materials.filter((m) => m.stock <= m.lowStockThreshold);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Material Inventory</h1>
          <p className="text-muted-foreground">Track stock levels and manage reordering</p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Material
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Low Stock Alert</h3>
          </div>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {lowStockItems.length} material(s) are below their reorder threshold
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Total Materials</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{materials.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Total Stock</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {materials.reduce((acc, m) => acc + m.stock, 0).toLocaleString()} g
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Low Stock</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{lowStockItems.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-medium text-muted-foreground">Total Value</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">
            ${materials.reduce((acc, m) => acc + m.stock * m.costPerUnit, 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Material</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Stock</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Cost/Unit</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Last Restocked
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => {
              const isLowStock = material.stock <= material.lowStockThreshold;
              const stockPercentage = (material.stock / (material.lowStockThreshold * 2)) * 100;

              return (
                <tr key={material.id} className="border-b border-border">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{material.name}</p>
                      <p className="text-xs text-muted-foreground">{material.color}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{material.type}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {material.stock} {material.unit}
                        </span>
                        <span className="text-muted-foreground">
                          Threshold: {material.lowStockThreshold}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isLowStock ? (
                      <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    ${material.costPerUnit.toFixed(2)}/{material.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {material.lastRestocked}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-2 text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
