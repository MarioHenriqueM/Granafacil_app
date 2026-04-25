import type { CircularityConfig, CircularityResult, Transaction } from './types.js';

function dayKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function withinTolerance(a: number, b: number, tolerancePct: number): boolean {
  const max = Math.max(Math.abs(a), Math.abs(b));
  if (max === 0) return true;
  return Math.abs(a - b) / max <= tolerancePct;
}

export function filterCircular(
  transactions: readonly Transaction[],
  config: CircularityConfig,
): CircularityResult {
  const totalCreditsOriginal = transactions.filter((t) => t.type === 'CREDIT').length;
  if (transactions.length === 0) {
    return {
      pairsRemoved: 0,
      totalCreditsOriginal: 0,
      circularityRatio: 0,
      cleanedTransactions: [],
    };
  }

  const indexByDay = new Map<string, number[]>();
  transactions.forEach((tx, idx) => {
    const key = dayKey(tx.date);
    const bucket = indexByDay.get(key);
    if (bucket) bucket.push(idx);
    else indexByDay.set(key, [idx]);
  });

  const removed = new Set<number>();

  for (const indices of indexByDay.values()) {
    const creditIdx = indices.filter((i) => (transactions[i] as Transaction).type === 'CREDIT');
    const debitIdx = indices.filter((i) => (transactions[i] as Transaction).type === 'DEBIT');
    const usedDebits = new Set<number>();

    for (const ci of creditIdx) {
      const credit = transactions[ci] as Transaction;
      const match = debitIdx.find(
        (di) =>
          !usedDebits.has(di) &&
          withinTolerance(credit.amount, (transactions[di] as Transaction).amount, config.tolerancePct),
      );
      if (match !== undefined) {
        removed.add(ci);
        removed.add(match);
        usedDebits.add(match);
      }
    }
  }

  const pairsRemoved = removed.size / 2;
  const cleanedTransactions = transactions.filter((_, i) => !removed.has(i));
  const circularityRatio = totalCreditsOriginal > 0 ? pairsRemoved / totalCreditsOriginal : 0;

  return { pairsRemoved, totalCreditsOriginal, circularityRatio, cleanedTransactions };
}
