/** Display formatting. Money is stored in integer minor units (piasters, cents). */

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(minor: number | string | null | undefined, currency = 'EGP'): string {
  if (minor === null || minor === undefined || minor === '') {
    return '—';
  }
  const amount = Number(minor) / 100;
  if (!Number.isFinite(amount)) {
    return '—';
  }
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    moneyFormatters.set(currency, formatter);
  }
  // "EGP 824.00" — Intl puts a non-breaking space after the code.
  return formatter.format(amount).replace(/\s/g, ' ');
}

/** Compact axis label: "EGP 12k", "EGP 850". */
export function formatMoneyShort(minor: number, currency = 'EGP'): string {
  const major = minor / 100;
  if (major >= 1000) {
    return `${currency} ${formatNumber(major / 1000, major >= 10_000 ? 0 : 1)}k`;
  }
  return `${currency} ${formatNumber(major)}`;
}

export function formatDuration(minutes: number | string | null | undefined): string {
  const total = Math.round(Number(minutes));
  if (!Number.isFinite(total) || total <= 0) {
    return '—';
  }
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins}m`;
}

export function formatGrams(grams: number | string | null | undefined): string {
  const value = Number(grams);
  if (grams === null || grams === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return value >= 1000 ? `${(value / 1000).toFixed(2)} kg` : `${value.toFixed(1)} g`;
}

export function formatNumber(value: number | string | null | undefined, digits = 0): string {
  const parsed = Number(value);
  if (value === null || value === undefined || !Number.isFinite(parsed)) {
    return '—';
  }
  return parsed.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (Number.isNaN(diffMinutes)) {
    return '—';
  }
  if (diffMinutes < 1) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffMinutes < 1440) {
    return `${Math.round(diffMinutes / 60)}h ago`;
  }
  if (diffMinutes < 10_080) {
    return `${Math.round(diffMinutes / 1440)}d ago`;
  }
  return formatDate(date);
}

/** "drone_arm_v2" from "drone_arm_v2.stl". */
export function stripExtension(filename: string): string {
  return filename.replace(/\.(stl|obj|3mf)$/i, '');
}
