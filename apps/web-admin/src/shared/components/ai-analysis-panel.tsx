import { CheckCircle, AlertTriangle, Info, Clock, Weight, Layers, Target } from 'lucide-react';

interface AIAnalysisPanelProps {
  printabilityScore: number;
  recommendedOrientation: { x: number; y: number; z: number };
  orientationScore: number;
  materialWeight: number;
  estimatedTime: number;
  supportAnalysis?: {
    supportVolume: number;
    supportPercentage: number;
    supportDifficulty: 'low' | 'medium' | 'high' | 'extreme';
  };
  riskAnalysis: {
    riskPercentage: number;
    riskFactors: Array<{ factor: string; severity: string; description: string }>;
  };
  recommendations: string[];
  isAnalyzing?: boolean;
}

export function AIAnalysisPanel({
  printabilityScore,
  recommendedOrientation,
  orientationScore,
  materialWeight,
  estimatedTime,
  supportAnalysis,
  riskAnalysis,
  recommendations,
  isAnalyzing = false,
}: AIAnalysisPanelProps) {
  if (isAnalyzing) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium text-foreground">Analyzing model...</span>
        </div>
      </div>
    );
  }

  const getPrintabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPrintabilityLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getSupportColor = (difficulty: string) => {
    switch (difficulty) {
      case 'low':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'high':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const getRiskColor = (percentage: number) => {
    if (percentage < 20) return 'text-green-600';
    if (percentage < 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Printability Score */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">AI Print Analysis</h3>
          <div className={`text-2xl font-bold ${getPrintabilityColor(printabilityScore)}`}>
            {printabilityScore}%
          </div>
        </div>
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                printabilityScore >= 80
                  ? 'bg-green-500'
                  : printabilityScore >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${printabilityScore}%` }}
            />
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getPrintabilityColor(printabilityScore)} bg-opacity-10`}
        >
          {getPrintabilityLabel(printabilityScore)}
        </div>
      </div>

      {/* Recommended Orientation */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recommended Orientation</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">X Rotation</div>
            <div className="text-lg font-semibold text-foreground">{recommendedOrientation.x}°</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Y Rotation</div>
            <div className="text-lg font-semibold text-foreground">{recommendedOrientation.y}°</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Z Rotation</div>
            <div className="text-lg font-semibold text-foreground">{recommendedOrientation.z}°</div>
          </div>
        </div>
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Orientation score</span>
            <span className="text-sm font-semibold text-foreground">{orientationScore}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500 bg-blue-500"
              style={{ width: `${orientationScore}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Target size={16} className="text-blue-500" />
          <span>Optimal orientation for print quality</span>
        </div>
      </div>

      {/* Material & Time Estimates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Weight size={18} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">Estimated Material</h3>
          </div>
          <div className="text-2xl font-bold text-foreground">{materialWeight.toFixed(1)}g</div>
          <div className="text-sm text-muted-foreground mt-1">PLA</div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">Estimated Time</h3>
          </div>
          <div className="text-2xl font-bold text-foreground">{formatTime(estimatedTime)}</div>
          <div className="text-sm text-muted-foreground mt-1">Print time</div>
        </div>
      </div>

      {/* Support Analysis - only show if provided */}
      {supportAnalysis && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={18} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-foreground">Support Analysis</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Support Volume</div>
              <div className="text-lg font-semibold text-foreground">
                {supportAnalysis.supportVolume.toFixed(1)} cm³
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Support Percentage</div>
              <div className="text-lg font-semibold text-foreground">
                {supportAnalysis.supportPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getSupportColor(supportAnalysis.supportDifficulty)}`}
          >
            {supportAnalysis.supportDifficulty.charAt(0).toUpperCase() +
              supportAnalysis.supportDifficulty.slice(1)}{' '}
            Support
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-blue-500" />
          <h3 className="text-lg font-semibold text-foreground">Risk Assessment</h3>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Failure Risk</span>
            <span className={`text-lg font-semibold ${getRiskColor(riskAnalysis.riskPercentage)}`}>
              {riskAnalysis.riskPercentage}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                riskAnalysis.riskPercentage < 20
                  ? 'bg-green-500'
                  : riskAnalysis.riskPercentage < 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${riskAnalysis.riskPercentage}%` }}
            />
          </div>
        </div>
        {riskAnalysis.riskFactors.length > 0 && (
          <div className="space-y-2">
            {riskAnalysis.riskFactors.map((factor, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <Info size={14} className="text-blue-500 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">{factor.factor}:</span>
                  <span className="text-muted-foreground ml-1">{factor.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-foreground">Recommendations</h3>
          </div>
          <ul className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This analysis is an estimate based on geometric calculations.
            Actual print requirements may vary upon review and may require adjustment based on
            specific printer settings, material properties, and print conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
