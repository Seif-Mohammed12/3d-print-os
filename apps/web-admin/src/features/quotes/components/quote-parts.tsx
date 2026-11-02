import { AlertTriangle, Info } from 'lucide-react';

import { formatDuration, formatGrams, formatMoney, formatNumber } from '../../../shared/lib/format';
import { cn } from '../../../shared/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  DetailList,
  type Stock,
  StockTag,
} from '../../../shared/ui';
import {
  QUOTE_STATUS_LABEL,
  type Quote,
  type QuoteStatus,
  type RiskFactor,
} from '../model/quote-types';

const STATUS_STOCK: Record<QuoteStatus, Stock> = {
  draft: 'draft',
  pending: 'quoted',
  approved: 'approved',
  rejected: 'void',
  completed: 'done',
};

/** Card stock for a quote: a slicer-priced draft is ready to send, so it is already yellow. */
export function quoteStock(quote: Pick<Quote, 'status' | 'estimate_source'>): Stock {
  return quote.status === 'draft' && quote.estimate_source === 'slicer'
    ? 'quoted'
    : STATUS_STOCK[quote.status];
}

export function QuoteStatusBadge({ quote }: { quote: Pick<Quote, 'status' | 'estimate_source'> }) {
  if (quote.status === 'draft' && quote.estimate_source === 'slicer') {
    return <StockTag stock="quoted">Priced</StockTag>;
  }
  return <StockTag stock={quoteStock(quote)}>{QUOTE_STATUS_LABEL[quote.status]}</StockTag>;
}

export function PriceSummary({ quote }: { quote: Quote }) {
  const breakdown = quote.pricing_breakdown;
  const currency = quote.currency?.trim() || 'EGP';
  if (!breakdown) {
    return null;
  }
  const lines: Array<[string, number]> = [
    ['Material', breakdown.materialCost],
    [`Machine time · ${formatDuration(breakdown.machineMinutes)}`, breakdown.machineTimeCost],
    ['Electricity', breakdown.electricityCost],
    ['Maintenance', breakdown.maintenanceCost],
    ['Post-processing', breakdown.postProcessingCost],
    [`Failure allowance · ${breakdown.rates.failureRiskPercentage}%`, breakdown.failureRiskCost],
  ];
  return (
    <Card>
      <CardHeader title="Price" description={`Margin ${breakdown.rates.profitMarginPercentage}%`} />
      <CardContent className="space-y-4">
        <dl className="space-y-2 text-sm">
          {lines
            .filter(([, value]) => value > 0)
            .map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="tabular text-foreground">{formatMoney(value, currency)}</dd>
              </div>
            ))}
          <div className="flex justify-between gap-4 border-t border-border pt-2">
            <dt className="text-muted-foreground">Production cost</dt>
            <dd className="tabular text-foreground">
              {formatMoney(breakdown.productionCost, currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Margin</dt>
            <dd className="tabular text-foreground">
              {formatMoney(breakdown.profitMargin, currency)}
            </dd>
          </div>
          {breakdown.tax > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                Tax · {formatNumber(breakdown.rates.taxRateBps / 100, 0)}%
              </dt>
              <dd className="tabular text-foreground">{formatMoney(breakdown.tax, currency)}</dd>
            </div>
          )}
        </dl>
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="tabular text-2xl font-semibold tracking-tight text-foreground">
            {formatMoney(quote.total_cents, currency)}
          </span>
        </div>
        {breakdown.minimumPriceApplied && (
          <p className="text-xs text-muted-foreground">
            The shop's minimum price applies to this job.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const FEATURE_LABEL: Record<string, string> = {
  'External perimeter': 'Outer walls',
  Perimeter: 'Inner walls',
  'Overhang perimeter': 'Overhangs',
  'Internal infill': 'Infill',
  'Solid infill': 'Solid infill',
  'Top solid infill': 'Top surfaces',
  'Bridge infill': 'Bridges',
  'Gap fill': 'Gap fill',
  'Skirt/Brim': 'Skirt and brim',
  'Support material': 'Supports',
  'Support material interface': 'Support interface',
};

/** Supports are waste, so they get the yellow "look at this" stock; the part itself alternates. */
function featureFill(feature: string, index: number): string {
  if (feature.startsWith('Support')) {
    return 'bg-stock-quoted';
  }
  return index % 2 ? 'bg-chart/55' : 'bg-chart';
}

export function SliceDetails({ quote }: { quote: Quote }) {
  const slice = quote.slice_result;
  if (!slice) {
    return null;
  }
  const estimate = slice.estimate;
  const calibration = quote.pricing_breakdown?.calibration;
  const total = estimate.features.reduce((sum, f) => sum + f.grams, 0) || 1;
  const size = slice.orientation.size_mm;

  return (
    <Card>
      <CardHeader
        title="Print estimate"
        description={`${slice.slicer.name} ${slice.slicer.version.replace(/\+.*/, '')}`}
      />
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-px border-y border-border bg-border sm:grid-cols-4">
          {[
            ['Print time', formatDuration(quote.estimated_time_minutes)],
            ['Filament', formatGrams(calibration?.filament.calibrated_g ?? estimate.filament_g)],
            ['Supports', formatGrams(estimate.support_g)],
            ['Layers', formatNumber(estimate.layer_count)],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="tabular mt-0.5 text-lg font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-foreground">Where the filament goes</p>
          <div className="flex h-3 overflow-hidden rounded-sm border border-stock-edge bg-muted">
            {estimate.features.map((feature, index) => (
              <div
                key={feature.feature}
                className={cn(
                  'h-full border-e border-card last:border-0',
                  featureFill(feature.feature, index),
                )}
                style={{ width: `${(feature.grams / total) * 100}%` }}
              />
            ))}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {estimate.features
              .filter((feature) => feature.grams >= 0.05)
              .map((feature) => (
                <div key={feature.feature} className="flex items-center justify-between gap-2">
                  <dt className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-2.5 w-2.5 shrink-0 rounded-sm',
                        featureFill(
                          feature.feature,
                          estimate.features.findIndex((f) => f.feature === feature.feature),
                        ),
                      )}
                    />
                    <span className="truncate">
                      {FEATURE_LABEL[feature.feature] ?? feature.feature}
                    </span>
                  </dt>
                  <dd className="tabular text-foreground">{formatGrams(feature.grams)}</dd>
                </div>
              ))}
          </dl>
        </div>

        <DetailList
          items={[
            {
              label: 'Print orientation',
              value:
                slice.orientation.label === 'as_uploaded'
                  ? 'As uploaded'
                  : `Re-oriented (best of ${slice.candidates.filter((c) => c.estimate).length})`,
            },
            {
              label: 'Size on the bed',
              value:
                size.length === 3 ? `${size.map((v) => formatNumber(v, 1)).join(' × ')} mm` : '—',
            },
            ...(calibration
              ? [
                  {
                    label: 'Time calibration',
                    value: calibration.print_time.applied
                      ? `×${calibration.print_time.factor.toFixed(2)} from ${calibration.print_time.sample_count} jobs`
                      : `Not yet (${calibration.print_time.sample_count}/${calibration.min_samples} jobs)`,
                  },
                ]
              : []),
          ]}
        />
      </CardContent>
    </Card>
  );
}

const SEVERITY_TONE: Record<RiskFactor['severity'], string> = {
  low: 'text-muted-foreground',
  medium: 'text-warning',
  high: 'text-destructive',
};

export function RiskList({
  factors,
  warnings = [],
}: {
  factors: RiskFactor[];
  warnings?: string[];
}) {
  if (factors.length === 0 && warnings.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader title="Things to check" />
      <CardContent>
        <ul className="space-y-2.5 text-sm">
          {warnings.map((warning) => (
            <li key={warning} className="flex gap-2.5 text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {warning}
            </li>
          ))}
          {factors.map((factor, index) => (
            <li key={`${factor.factor}-${index}`} className="flex gap-2.5">
              <AlertTriangle
                className={cn('mt-0.5 h-4 w-4 shrink-0', SEVERITY_TONE[factor.severity])}
                aria-hidden="true"
              />
              <span className="text-foreground">{factor.description}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
