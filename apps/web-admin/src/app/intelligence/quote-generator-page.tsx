import { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  Clock,
  Package,
  Printer,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  File as FileIcon,
} from 'lucide-react';

interface QuoteCost {
  materialCost: number;
  machineTimeCost: number;
  electricityCost: number;
  maintenanceCost: number;
  postProcessingCost: number;
  failureRiskCost: number;
  subtotal: number;
  marginAmount: number;
  total: number;
}

export function QuoteGeneratorPage() {
  const [selectedMaterial, setSelectedMaterial] = useState(
    () => sessionStorage.getItem('quoteMaterial') || 'pla',
  );
  const [selectedPrinter, setSelectedPrinter] = useState(
    () => sessionStorage.getItem('quotePrinter') || 'fdm',
  );
  const [margin, setMargin] = useState(() => sessionStorage.getItem('quoteMargin') || '20');
  const [weight, setWeight] = useState(() => sessionStorage.getItem('quoteWeight') || '');
  const [printTime, setPrintTime] = useState(() => sessionStorage.getItem('quotePrintTime') || '');
  const [quoteGenerated, setQuoteGenerated] = useState(
    () => sessionStorage.getItem('quoteGenerated') === 'true',
  );
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState(
    () => sessionStorage.getItem('quoteFileName') || '',
  );
  const [modelAnalysis, setModelAnalysis] = useState<any>(null);
  const [accuracyData, setAccuracyData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Re-render when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setPlaCost(localStorage.getItem('plaCost') || '2.5');
      setAbsCost(localStorage.getItem('absCost') || '3.0');
      setPetgCost(localStorage.getItem('petgCost') || '3.5');
      setTpuCost(localStorage.getItem('tpuCost') || '4.0');
      setFdmRate(localStorage.getItem('fdmRate') || '25');
      setSlaRate(localStorage.getItem('slaRate') || '75');
      setElectricityRate(localStorage.getItem('electricityRate') || '25');
      setMaintenanceRate(localStorage.getItem('maintenanceRate') || '50');
      setPostProcessingRate(localStorage.getItem('postProcessingRate') || '500');
      setTaxRate(localStorage.getItem('taxRate') || '14');
      setMinimumOrder(localStorage.getItem('minimumOrder') || '500');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Persist quote state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('quoteMaterial', selectedMaterial);
    sessionStorage.setItem('quotePrinter', selectedPrinter);
    sessionStorage.setItem('quoteMargin', margin);
    sessionStorage.setItem('quoteWeight', weight);
    sessionStorage.setItem('quotePrintTime', printTime);
    sessionStorage.setItem('quoteGenerated', quoteGenerated.toString());
    sessionStorage.setItem('quoteFileName', uploadedFileName);
  }, [
    selectedMaterial,
    selectedPrinter,
    margin,
    weight,
    printTime,
    quoteGenerated,
    uploadedFileName,
  ]);

  const materials = [
    { id: 'pla', name: 'PLA', costPerGram: parseFloat(plaCost) || 2.5, density: 1.24 },
    { id: 'abs', name: 'ABS', costPerGram: parseFloat(absCost) || 3.0, density: 1.04 },
    { id: 'petg', name: 'PETG', costPerGram: parseFloat(petgCost) || 3.5, density: 1.27 },
    { id: 'tpu', name: 'TPU', costPerGram: parseFloat(tpuCost) || 4.0, density: 1.21 },
  ];

  const printers = [
    {
      id: 'fdm',
      name: 'FDM',
      hourlyRate: parseFloat(fdmRate) || 25,
      powerKw: 0.3,
    },
    { id: 'sla', name: 'SLA', hourlyRate: parseFloat(slaRate) || 75, powerKw: 0.5 },
  ];

  const calculateCost = (): QuoteCost => {
    const weightGrams = parseFloat(weight) || 0;
    const timeMinutes = parseFloat(printTime) || 0;
    const material = materials.find((m) => m.id === selectedMaterial);
    const printer = printers.find((p) => p.id === selectedPrinter);

    if (!material || !printer || weightGrams <= 0 || timeMinutes <= 0) {
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

    const materialCostPiasters = Math.round(weightGrams * material.costPerGram * 100);
    const printTimeHours = timeMinutes / 60;
    const machineTimeCostPiasters = Math.round(printTimeHours * printer.hourlyRate * 100);
    const electricityCostPiasters = Math.round(
      printTimeHours * (parseFloat(electricityRate) || 25) * 100,
    );
    const maintenanceCostPiasters = Math.round(
      printTimeHours * (parseFloat(maintenanceRate) || 50) * 100,
    );
    const postProcessingCostPiasters = Math.round((parseFloat(postProcessingRate) || 500) * 100);
    const baseCost =
      materialCostPiasters +
      machineTimeCostPiasters +
      electricityCostPiasters +
      maintenanceCostPiasters;

    const subtotalPiasters = baseCost + postProcessingCostPiasters;

    // Customer pricing
    const marginPercentage = parseInt(margin);
    const profitMarginPiasters = Math.round(subtotalPiasters * (marginPercentage / 100));
    const customerSubtotalPiasters = Math.max(
      (parseFloat(minimumOrder) || 500) * 100,
      subtotalPiasters + profitMarginPiasters,
    );
    const customerTaxPiasters = Math.round(
      customerSubtotalPiasters * ((parseFloat(taxRate) || 14) / 100),
    );
    const totalPricePiasters = customerSubtotalPiasters + customerTaxPiasters;

    return {
      materialCost: materialCostPiasters / 100,
      machineTimeCost: machineTimeCostPiasters / 100,
      electricityCost: electricityCostPiasters / 100,
      maintenanceCost: maintenanceCostPiasters / 100,
      postProcessingCost: postProcessingCostPiasters / 100,
      failureRiskCost: 0,
      subtotal: subtotalPiasters / 100,
      marginAmount: (customerSubtotalPiasters - subtotalPiasters) / 100,
      total: totalPricePiasters / 100,
    };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setUploadedFileName(file.name);
      // Reset quote when new file is uploaded
      setQuoteGenerated(false);
      setAccuracyData(null);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadedFileName('');
    setModelAnalysis(null);
    setAccuracyData(null);
    setQuoteGenerated(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const calculateAccuracy = (estimated: number, actual: number): number => {
    if (estimated === 0) return 0;
    const accuracy = 100 - (Math.abs(estimated - actual) / estimated) * 100;
    return Math.max(0, Math.round(accuracy * 100) / 100);
  };

  const handleSaveTrainingData = async () => {
    if (!accuracyData || !uploadedFile || !modelAnalysis) {
      alert('Missing required data for training');
      return;
    }

    try {
      const trainingData = {
        estimatedWeight: accuracyData.estimatedWeight,
        actualWeight: accuracyData.actualWeight,
        estimatedTime: accuracyData.estimatedTime,
        actualTime: accuracyData.actualTime,
        estimatedPrice: accuracyData.estimatedPrice,
        actualPrice: accuracyData.actualPrice,
        weightAccuracy: accuracyData.weightAccuracy,
        timeAccuracy: accuracyData.timeAccuracy,
        priceAccuracy: accuracyData.priceAccuracy,
        modelAnalysis: {
          volume: modelAnalysis.volume,
          dimensions: modelAnalysis.dimensions,
          surfaceArea: modelAnalysis.surfaceArea,
          triangleCount: modelAnalysis.triangleCount,
        },
        material: selectedMaterial,
        printer: selectedPrinter,
        margin: parseFloat(margin),
      };

      // TODO: Replace with actual API call when backend is ready
      // Example: await apiClient.instance.post('/training-samples', trainingData);

      // For now, save to localStorage as a placeholder
      const existingTrainingData = JSON.parse(localStorage.getItem('trainingData') || '[]');
      existingTrainingData.push({
        ...trainingData,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('trainingData', JSON.stringify(existingTrainingData));

      alert('Training data saved to localStorage (placeholder - needs backend API)');
    } catch (error) {
      console.error('Error saving training data:', error);
      alert('Failed to save training data');
    }
  };

  const generateQuote = () => {
    const weightGrams = parseFloat(weight);
    const timeMinutes = parseFloat(printTime);

    if (!weightGrams || weightGrams <= 0) {
      setError('Please enter a valid weight');
      return;
    }

    if (!timeMinutes || timeMinutes <= 0) {
      setError('Please enter a valid print time');
      return;
    }

    setError(null);
    setQuoteGenerated(true);

    // Calculate accuracy if we have model analysis data
    if (modelAnalysis) {
      const weightAccuracy = calculateAccuracy(modelAnalysis.weight, weightGrams);
      const timeAccuracy = calculateAccuracy(modelAnalysis.estimatedTime, timeMinutes);

      const estimatedPrice = modelAnalysis.estimatedPriceRange?.max || 0;
      const actualPrice = quoteGenerated ? calculateCost().total : 0;
      const priceAccuracy = estimatedPrice > 0 ? calculateAccuracy(estimatedPrice, actualPrice) : 0;

      setAccuracyData({
        weightAccuracy,
        timeAccuracy,
        priceAccuracy,
        estimatedWeight: modelAnalysis.weight,
        actualWeight: weightGrams,
        estimatedTime: modelAnalysis.estimatedTime,
        actualTime: timeMinutes,
        estimatedPrice,
        actualPrice,
      });
    }
  };

  const quote = quoteGenerated ? calculateCost() : null;

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
          {/* File Upload Section */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Model File</h3>

            {!uploadedFile ? (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Upload STL file</p>
                <p className="text-xs text-muted-foreground">Click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".stl,.STL"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{uploadedFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button onClick={handleRemoveFile} className="p-2 hover:bg-accent rounded-md">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Print Parameters</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="weight" className="block text-sm font-medium mb-2">
                  Weight (grams)
                </label>
                <input
                  id="weight"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 50"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="printTime" className="block text-sm font-medium mb-2">
                  Print Time (minutes)
                </label>
                <input
                  id="printTime"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 120"
                  value={printTime}
                  onChange={(e) => setPrintTime(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
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
                      {m.name} ({m.costPerGram} EGP/g)
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
                      {p.name} ({p.hourlyRate} EGP/hr)
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
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Generate Quote
              </button>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {quote && (
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
                <span className="text-sm font-medium">{quote.materialCost.toFixed(2)} EGP</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Machine Time</span>
                </div>
                <span className="text-sm font-medium">{quote.machineTimeCost.toFixed(2)} EGP</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Electricity</span>
                </div>
                <span className="text-sm font-medium">{quote.electricityCost.toFixed(2)} EGP</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Post-Processing</span>
                </div>
                <span className="text-sm font-medium">
                  {quote.postProcessingCost.toFixed(2)} EGP
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-t-2 border-border">
                <span className="text-sm font-medium text-foreground">Subtotal</span>
                <span className="text-sm font-medium text-foreground">
                  {quote.subtotal.toFixed(2)} EGP
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Margin ({margin}%)</span>
                <span className="text-sm font-medium text-foreground">
                  {quote.marginAmount.toFixed(2)} EGP
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-t-2 border-border bg-muted/50 rounded-md px-3">
                <div>
                  <span className="text-base font-bold text-foreground">Total</span>
                  <p className="text-xs text-muted-foreground">Final price including all costs</p>
                </div>
                <span className="text-base font-bold text-foreground">
                  {Math.round(quote.total)} EGP
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

        {accuracyData && (
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-foreground">Estimation Accuracy</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Weight Accuracy</span>
                <span
                  className={`text-sm font-medium ${accuracyData.weightAccuracy >= 80 ? 'text-green-600' : accuracyData.weightAccuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}
                >
                  {accuracyData.weightAccuracy.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Estimated: {accuracyData.estimatedWeight.toFixed(1)}g vs Actual:{' '}
                {accuracyData.actualWeight.toFixed(1)}g
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Time Accuracy</span>
                <span
                  className={`text-sm font-medium ${accuracyData.timeAccuracy >= 80 ? 'text-green-600' : accuracyData.timeAccuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}
                >
                  {accuracyData.timeAccuracy.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Estimated: {accuracyData.estimatedTime.toFixed(0)}min vs Actual:{' '}
                {accuracyData.actualTime.toFixed(0)}min
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Price Accuracy</span>
                <span
                  className={`text-sm font-medium ${accuracyData.priceAccuracy >= 80 ? 'text-green-600' : accuracyData.priceAccuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}
                >
                  {accuracyData.priceAccuracy.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Estimated: {accuracyData.estimatedPrice} EGP vs Actual:{' '}
                {Math.round(accuracyData.actualPrice)} EGP
              </div>

              <button
                onClick={handleSaveTrainingData}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 mt-4"
              >
                Save Training Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
