import { useState, useRef, useCallback } from 'react';
import {
  DollarSign,
  Clock,
  Package,
  Printer,
  CheckCircle,
  Upload,
  AlertCircle,
} from 'lucide-react';

interface Triangle {
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
  v3: { x: number; y: number; z: number };
}

interface PrintEstimation {
  material: {
    shellVolumeCm3: number;
    infillVolumeCm3: number;
    supportVolumeCm3: number;
    adhesionVolumeCm3: number;
    totalMaterialVolumeCm3: number;
    estimatedWeightGrams: number;
  };
  time: {
    layers: number;
    printTimeSeconds: number;
    travelTimeSeconds: number;
    accelerationFactor: number;
    totalTimeMinutes: number;
  };
  difficultyScore: number;
  riskPercentage: number;
  riskFactors: Array<{ factor: string; severity: string; description: string }>;
}

export function QuoteGeneratorPage() {
  const [selectedMaterial, setSelectedMaterial] = useState('pla');
  const [selectedPrinter, setSelectedPrinter] = useState('fdm_basic');
  const [margin, setMargin] = useState('20');
  const [quoteGenerated, setQuoteGenerated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [printEstimation, setPrintEstimation] = useState<PrintEstimation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const materials = [
    { id: 'pla', name: 'PLA', costPerGram: 0.05, density: 1.24 },
    { id: 'abs', name: 'ABS', costPerGram: 0.06, density: 1.04 },
    { id: 'petg', name: 'PETG', costPerGram: 0.07, density: 1.27 },
    { id: 'tpu', name: 'TPU', costPerGram: 0.08, density: 1.21 },
  ];

  const printers = [
    { id: 'fdm_basic', name: 'FDM Basic', hourlyRate: 0.5, powerKw: 0.3 },
    { id: 'fdm_pro', name: 'FDM Pro', hourlyRate: 1.0, powerKw: 0.4 },
    { id: 'sla', name: 'SLA', hourlyRate: 1.5, powerKw: 0.5 },
  ];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0] && files[0].name.endsWith('.stl')) {
      setUploadedFile(files[0]);
      setError(null);
    } else {
      setError('Please upload an STL file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0] && files[0].name.endsWith('.stl')) {
      setUploadedFile(files[0]);
      setError(null);
    } else {
      setError('Please upload an STL file');
    }
  }, []);

  const parseSTL = async (arrayBuffer: ArrayBuffer): Promise<Triangle[]> => {
    const dataView = new DataView(arrayBuffer);
    const triangles: Triangle[] = [];

    // Check if binary STL (84 byte header + triangle count)
    if (arrayBuffer.byteLength > 84) {
      const triangleCount = dataView.getUint32(80, true);
      const expectedSize = 84 + triangleCount * 50;

      if (arrayBuffer.byteLength >= expectedSize) {
        // Binary STL
        for (let i = 0; i < triangleCount; i++) {
          const offset = 84 + i * 50;
          const v1 = {
            x: dataView.getFloat32(offset + 12, true),
            y: dataView.getFloat32(offset + 16, true),
            z: dataView.getFloat32(offset + 20, true),
          };
          const v2 = {
            x: dataView.getFloat32(offset + 24, true),
            y: dataView.getFloat32(offset + 28, true),
            z: dataView.getFloat32(offset + 32, true),
          };
          const v3 = {
            x: dataView.getFloat32(offset + 36, true),
            y: dataView.getFloat32(offset + 40, true),
            z: dataView.getFloat32(offset + 44, true),
          };
          triangles.push({ v1, v2, v3 });
        }
        return triangles;
      }
    }

    // ASCII STL
    const text = new TextDecoder().decode(arrayBuffer);
    const lines = text.split('\n');
    let currentTriangle: Partial<Triangle> = {};
    let vertexCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('vertex')) {
        const parts = trimmed.split(/\s+/);
        const vertex = {
          x: parseFloat(parts[1] || '0'),
          y: parseFloat(parts[2] || '0'),
          z: parseFloat(parts[3] || '0'),
        };

        if (vertexCount === 0) currentTriangle.v1 = vertex;
        else if (vertexCount === 1) currentTriangle.v2 = vertex;
        else if (vertexCount === 2) currentTriangle.v3 = vertex;
        vertexCount++;
      } else if (
        trimmed.startsWith('endfacet') &&
        currentTriangle.v1 &&
        currentTriangle.v2 &&
        currentTriangle.v3
      ) {
        triangles.push(currentTriangle as Triangle);
        currentTriangle = {};
        vertexCount = 0;
      }
    }

    return triangles;
  };

  const calculateBoundingBox = (triangles: Triangle[]) => {
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const tri of triangles) {
      for (const v of [tri.v1, tri.v2, tri.v3]) {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        minZ = Math.min(minZ, v.z);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
        maxZ = Math.max(maxZ, v.z);
      }
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    };
  };

  const calculateVolume = (triangles: Triangle[]): number => {
    let volume = 0;
    for (const tri of triangles) {
      const v1 = tri.v1;
      const v2 = tri.v2;
      const v3 = tri.v3;
      const signedVolume =
        (v1.x * (v2.y * v3.z - v2.z * v3.y) +
          v1.y * (v2.z * v3.x - v2.x * v3.z) +
          v1.z * (v2.x * v3.y - v2.y * v3.x)) /
        6;
      volume += signedVolume;
    }
    return Math.abs(volume);
  };

  const calculateSurfaceArea = (triangles: Triangle[]): number => {
    let surfaceArea = 0;
    for (const tri of triangles) {
      const v1 = tri.v1;
      const v2 = tri.v2;
      const v3 = tri.v3;
      const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
      const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
      const cross = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x,
      };
      surfaceArea += Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z) / 2;
    }
    return surfaceArea;
  };

  const estimatePrint = (
    triangles: Triangle[],
    material: (typeof materials)[0],
    _printer: (typeof printers)[0],
  ) => {
    const boundingBox = calculateBoundingBox(triangles);
    const volumeMm3 = calculateVolume(triangles);
    const surfaceAreaMm2 = calculateSurfaceArea(triangles);

    const dimensions = {
      x: boundingBox.max.x - boundingBox.min.x,
      y: boundingBox.max.y - boundingBox.min.y,
      z: boundingBox.max.z - boundingBox.min.z,
    };

    const volumeCm3 = volumeMm3 / 1000;

    // Material estimation
    const shellVolumeCm3 = volumeCm3 * 0.25;
    const innerVolumeCm3 = volumeCm3 - shellVolumeCm3;
    const infillVolumeCm3 = innerVolumeCm3 * 0.2; // 20% infill
    const aspectRatio = dimensions.z / Math.max(dimensions.x, dimensions.y);
    const supportPercentage = aspectRatio > 3 ? 0.25 : aspectRatio > 2 ? 0.15 : 0.05;
    const supportVolumeCm3 = volumeCm3 * supportPercentage;
    const adhesionVolumeCm3 = volumeCm3 * 0.03;
    const totalMaterialVolumeCm3 =
      shellVolumeCm3 + infillVolumeCm3 + supportVolumeCm3 + adhesionVolumeCm3;
    const wasteBuffer = totalMaterialVolumeCm3 * 0.05;
    const finalMaterialVolumeCm3 = totalMaterialVolumeCm3 + wasteBuffer;
    const estimatedWeightGrams = finalMaterialVolumeCm3 * material.density;

    // Time estimation - using volumetric flow rate like real slicers
    const layerHeightMm = 0.2;
    const layers = Math.ceil(dimensions.z / layerHeightMm);
    const nozzleWidthMm = 0.4 * 1.2; // Extrusion width
    const volumetricFlowRateMm3PerS = 60 * layerHeightMm * nozzleWidthMm; // 60mm/s print speed

    // Effective volume accounts for infill (not solid STL volume)
    const effectiveVolumeMm3 = volumeMm3 * (0.3 + 0.2 * 0.7); // 20% infill
    const printTimeSeconds = effectiveVolumeMm3 / volumetricFlowRateMm3PerS;
    const travelTimeSeconds = printTimeSeconds * 0.18; // 18% travel time
    const accelerationFactor = 1.1; // Modern printers are faster
    const totalTimeSeconds = (printTimeSeconds + travelTimeSeconds) * accelerationFactor;
    const totalTimeMinutes = Math.round(totalTimeSeconds / 60);

    // Difficulty and risk assessment
    const surfaceToVolumeRatio = surfaceAreaMm2 / volumeMm3;
    let difficultyScore = 1;
    let riskPercentage = 0;
    const riskFactors: Array<{ factor: string; severity: string; description: string }> = [];

    if (surfaceToVolumeRatio > 5) {
      difficultyScore += 1;
      riskPercentage += 5;
      riskFactors.push({
        factor: 'complex_geometry',
        severity: 'low',
        description: 'High surface-to-volume ratio',
      });
    }
    if (aspectRatio > 8) {
      difficultyScore += 2;
      riskPercentage += 10;
      riskFactors.push({
        factor: 'tall_narrow',
        severity: 'medium',
        description: 'Very tall narrow geometry',
      });
    } else if (aspectRatio > 5) {
      difficultyScore += 1;
      riskPercentage += 5;
      riskFactors.push({
        factor: 'tall_geometry',
        severity: 'low',
        description: 'Tall geometry',
      });
    }
    if (totalTimeMinutes > 1440) {
      difficultyScore += 2;
      riskPercentage += 15;
      riskFactors.push({
        factor: 'long_print',
        severity: 'medium',
        description: 'Very long print time',
      });
    } else if (totalTimeMinutes > 720) {
      difficultyScore += 1;
      riskPercentage += 8;
      riskFactors.push({
        factor: 'long_print',
        severity: 'low',
        description: 'Long print',
      });
    }

    difficultyScore = Math.min(10, Math.max(1, difficultyScore));
    riskPercentage = Math.min(100, riskPercentage);

    return {
      material: {
        shellVolumeCm3: Math.round(shellVolumeCm3 * 100) / 100,
        infillVolumeCm3: Math.round(infillVolumeCm3 * 100) / 100,
        supportVolumeCm3: Math.round(supportVolumeCm3 * 100) / 100,
        adhesionVolumeCm3: Math.round(adhesionVolumeCm3 * 100) / 100,
        totalMaterialVolumeCm3: Math.round(finalMaterialVolumeCm3 * 100) / 100,
        estimatedWeightGrams: Math.round(estimatedWeightGrams * 10) / 10,
      },
      time: {
        layers,
        printTimeSeconds: Math.round(printTimeSeconds),
        travelTimeSeconds: Math.round(travelTimeSeconds),
        accelerationFactor,
        totalTimeMinutes,
      },
      difficultyScore,
      riskPercentage,
      riskFactors,
    };
  };

  const calculateCost = (
    estimation: PrintEstimation,
    material: (typeof materials)[0],
    printer: (typeof printers)[0],
  ) => {
    const materialCostCents = Math.round(
      estimation.material.estimatedWeightGrams * (material.costPerGram * 100),
    );
    const printTimeHours = estimation.time.totalTimeMinutes / 60;
    const machineTimeCostCents = Math.round(printTimeHours * (printer.hourlyRate * 100));
    const electricityCostCents = Math.round(printTimeHours * 50); // $0.50/hour
    const maintenanceCostCents = Math.round(printTimeHours * 100); // $1/hour
    const postProcessingCostCents = Math.round(estimation.difficultyScore * 200);
    const baseCost =
      materialCostCents + machineTimeCostCents + electricityCostCents + maintenanceCostCents;
    const failureRiskCostCents = Math.round(baseCost * (estimation.riskPercentage / 100));
    const subtotalCents = baseCost + postProcessingCostCents + failureRiskCostCents;
    const _taxCents = Math.round(subtotalCents * 0.08);

    // Customer pricing
    const marginPercentage = parseInt(margin);
    const profitMarginCents = Math.round(subtotalCents * (marginPercentage / 100));
    const complexityMultiplier =
      estimation.difficultyScore > 6 ? 1.2 : estimation.difficultyScore > 3 ? 1.1 : 1.0;
    const complexityAdjustmentCents = Math.round(subtotalCents * (complexityMultiplier - 1));
    const customerSubtotalCents = Math.max(
      500,
      subtotalCents + profitMarginCents + complexityAdjustmentCents,
    );
    const customerTaxCents = Math.round(customerSubtotalCents * 0.08);
    const totalPriceCents = customerSubtotalCents + customerTaxCents;

    return {
      materialCost: materialCostCents / 100,
      machineTimeCost: machineTimeCostCents / 100,
      electricityCost: electricityCostCents / 100,
      maintenanceCost: maintenanceCostCents / 100,
      postProcessingCost: postProcessingCostCents / 100,
      failureRiskCost: failureRiskCostCents / 100,
      subtotal: subtotalCents / 100,
      marginAmount: (customerSubtotalCents - subtotalCents) / 100,
      total: totalPriceCents / 100,
    };
  };

  const generateQuote = async () => {
    if (!uploadedFile) {
      setError('Please upload an STL file first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const triangles = await parseSTL(arrayBuffer);
      const material = materials.find((m) => m.id === selectedMaterial);
      const printer = printers.find((p) => p.id === selectedPrinter);

      if (!material || !printer) {
        setError('Invalid material or printer selection');
        return;
      }

      const estimation = estimatePrint(triangles, material, printer);
      setPrintEstimation(estimation);
      setQuoteGenerated(true);
    } catch (err) {
      setError('Failed to analyze STL file');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mockQuote = printEstimation
    ? (() => {
        const material = materials.find((m) => m.id === selectedMaterial);
        const printer = printers.find((p) => p.id === selectedPrinter);

        if (!material || !printer) {
          return {
            materialCost: 0,
            machineTimeCost: 0,
            electricityCost: 0,
            maintenanceCost: 0,
            postProcessingCost: 0,
            failureRiskCost: 0,
            subtotal: 0,
            marginAmount: 0,
            total: 0,
          };
        }

        return calculateCost(printEstimation, material, printer);
      })()
    : {
        materialCost: 6.28,
        machineTimeCost: 3.75,
        electricityCost: 0.5,
        postProcessingCost: 2.0,
        subtotal: 12.53,
        marginAmount: 3.13,
        total: 15.66,
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Quote Generator</h1>
        <p className="text-muted-foreground">
          AI-powered automatic pricing with realistic estimation
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Upload Model</h3>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-border/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your STL file here, or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".stl"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Select File
              </button>
              {uploadedFile && <p className="mt-4 text-sm text-foreground">{uploadedFile.name}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Configuration</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="material" className="block text-sm font-medium mb-2">
                  Material
                </label>
                <select
                  id="material"
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (${m.costPerGram}/g)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="printer" className="block text-sm font-medium mb-2">
                  Printer
                </label>
                <select
                  id="printer"
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.hourlyRate}/hr)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="margin" className="block text-sm font-medium mb-2">
                  Profit Margin (%)
                </label>
                <input
                  id="margin"
                  type="number"
                  min="0"
                  max="100"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <button
                onClick={generateQuote}
                disabled={!uploadedFile || isAnalyzing}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing...' : 'Generate Quote'}
              </button>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}
            </div>
          </div>

          {printEstimation && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Model Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="font-medium">
                    {printEstimation.material.totalMaterialVolumeCm3.toFixed(1)} cm³
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="font-medium">
                    {printEstimation.material.estimatedWeightGrams.toFixed(1)} g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Time</span>
                  <span className="font-medium">{printEstimation.time.totalTimeMinutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty</span>
                  <span className="font-medium">{printEstimation.difficultyScore}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk</span>
                  <span className="font-medium">{printEstimation.riskPercentage}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {quoteGenerated && (
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-foreground">Quote Generated</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Material Cost</span>
                </div>
                <span className="text-sm font-medium">${mockQuote.materialCost.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Machine Time</span>
                </div>
                <span className="text-sm font-medium">${mockQuote.machineTimeCost.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Electricity</span>
                </div>
                <span className="text-sm font-medium">${mockQuote.electricityCost.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Post-Processing</span>
                </div>
                <span className="text-sm font-medium">
                  ${mockQuote.postProcessingCost.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-t-2 border-border">
                <span className="text-sm font-medium text-foreground">Subtotal</span>
                <span className="text-sm font-medium text-foreground">
                  ${mockQuote.subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Margin ({margin}%)</span>
                <span className="text-sm font-medium text-foreground">
                  ${mockQuote.marginAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-t-2 border-border bg-muted/50 rounded-md px-3">
                <span className="text-base font-bold text-foreground">Total</span>
                <span className="text-base font-bold text-foreground">
                  ${mockQuote.total.toFixed(2)}
                </span>
              </div>

              <div className="flex gap-3 pt-4">
                <button className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
                  Download PDF
                </button>
                <button className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Send to Customer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
