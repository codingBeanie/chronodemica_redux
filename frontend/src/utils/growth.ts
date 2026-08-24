const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function yearsBetween(fromDate: string, toDate: string): number {
  return (new Date(toDate).getTime() - new Date(fromDate).getTime()) / MS_PER_YEAR;
}

/** Compound annual growth rate (%) from `previous` to `current` over `years`. */
export function annualGrowthPercent(previous: number, current: number, years: number): number | null {
  if (previous <= 0 || years <= 0) return null;
  return (Math.pow(current / previous, 1 / years) - 1) * 100;
}

export function formatGrowthPercent(rate: number | null): string {
  if (rate === null) return "-";
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%/yr`;
}
