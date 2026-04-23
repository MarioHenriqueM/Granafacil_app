import { computeFrequency } from './frequency.js';
import type { RegularityResult, Transaction } from './types.js';

export function computeRegularity(
  transactions: readonly Transaction[],
  windowDays: number,
): RegularityResult {
  const freq = computeFrequency(transactions, windowDays);

  if (freq.totalCredits < 2 || freq.meanGapDays === 0) {
    return { coefficientOfVariation: Infinity, score: 0 };
  }

  const cv = freq.stdDevGapDays / freq.meanGapDays;
  const score = 1 / (1 + cv);

  return { coefficientOfVariation: cv, score };
}
