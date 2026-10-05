/** Misma regla que lib/igf-diario-expense-layout.js. No copies esta comparación en otro archivo. */
export function usesDetailedExpenseLayout(year: number, month: number): boolean {
  return year > 2026 || (year === 2026 && month >= 10);
}

export function sumMoneyCents(values: Array<number | null>): number | null {
  const cents: number[] = [];
  for (const value of values) {
    if (value == null || !Number.isFinite(value)) return null;
    cents.push(Math.round(value * 100));
  }
  return cents.reduce((sum, item) => sum + item, 0) / 100;
}
