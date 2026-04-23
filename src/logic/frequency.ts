import type { FrequencyResult, Transaction } from './types.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_MONTH = 30;

export function computeFrequency(
  transactions: readonly Transaction[],
  windowDays: number,
): FrequencyResult {
  const credits = transactions.filter((t) => t.type === 'CREDIT');
  const totalCredits = credits.length;
  const entriesPerMonth = windowDays > 0 ? (totalCredits / windowDays) * DAYS_PER_MONTH : 0;

  if (totalCredits < 2) {
    return { entriesPerMonth, totalCredits, meanGapDays: 0, stdDevGapDays: 0 };
  }

  const timestamps = credits.map((t) => Date.parse(t.date)).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const prev = timestamps[i - 1] as number;
    const curr = timestamps[i] as number;
    gaps.push((curr - prev) / MS_PER_DAY);
  }

  const meanGapDays = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const variance = gaps.reduce((s, g) => s + (g - meanGapDays) ** 2, 0) / gaps.length;
  const stdDevGapDays = Math.sqrt(variance);

  return { entriesPerMonth, totalCredits, meanGapDays, stdDevGapDays };
}
