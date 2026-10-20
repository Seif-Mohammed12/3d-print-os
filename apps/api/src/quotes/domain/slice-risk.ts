export type RiskFactor = {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
};

export type SliceRiskInput = {
  printTimeSeconds: number;
  filamentGrams: number;
  supportGrams: number;
  meshIsWatertight: boolean;
  /** Shop data that was missing and replaced by defaults. */
  assumptions: string[];
};

const SEVERITY_RISK = { low: 3, medium: 10, high: 25 } as const;
const SEVERITY_DIFFICULTY = { low: 0, medium: 1, high: 2 } as const;

/** Risk factors from what the slicer actually produced, not from bounding-box guesses. */
export function assessSliceRisk(input: SliceRiskInput): {
  riskFactors: RiskFactor[];
  riskPercentage: number;
  difficultyScore: number;
} {
  const riskFactors: RiskFactor[] = [];
  const hours = input.printTimeSeconds / 3600;
  const supportShare = input.filamentGrams > 0 ? input.supportGrams / input.filamentGrams : 0;

  if (!input.meshIsWatertight) {
    riskFactors.push({
      factor: 'non_watertight',
      severity: 'high',
      description: 'Mesh has holes; the slicer repaired it, so check the part before printing',
    });
  }
  if (supportShare >= 0.3) {
    riskFactors.push({
      factor: 'heavy_supports',
      severity: 'medium',
      description: `${Math.round(supportShare * 100)}% of the filament is support material`,
    });
  } else if (supportShare >= 0.1) {
    riskFactors.push({
      factor: 'supports',
      severity: 'low',
      description: `${Math.round(supportShare * 100)}% of the filament is support material`,
    });
  }
  if (hours > 24) {
    riskFactors.push({
      factor: 'long_print',
      severity: 'medium',
      description: 'Print takes more than 24 hours',
    });
  } else if (hours > 12) {
    riskFactors.push({
      factor: 'long_print',
      severity: 'low',
      description: 'Print takes more than 12 hours',
    });
  }
  for (const assumption of input.assumptions) {
    riskFactors.push({ factor: 'estimate_assumption', severity: 'low', description: assumption });
  }

  const riskPercentage = Math.min(
    100,
    riskFactors.reduce((sum, f) => sum + SEVERITY_RISK[f.severity], 0),
  );
  const difficultyScore = Math.min(
    10,
    1 +
      Math.round(supportShare * 10) +
      Math.floor(hours / 12) +
      riskFactors.reduce((sum, f) => sum + SEVERITY_DIFFICULTY[f.severity], 0),
  );

  return { riskFactors, riskPercentage, difficultyScore };
}
