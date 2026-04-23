import type { BalanceResult, Transaction } from './types.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computeBalance(
  transactions: readonly Transaction[],
  windowDays: number,
): BalanceResult {
  if (transactions.length === 0 || windowDays <= 0) {
    return { netFlow: 0, avgMonthlyBalance: 0, negativeDaysRatio: 0, endBalance: 0 };
  }

  const sorted = [...transactions].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const firstTx = sorted[0] as Transaction;
  const startMs = Date.parse(firstTx.date);
  const startDay = Math.floor(startMs / MS_PER_DAY) * MS_PER_DAY;

  const dailyDelta = new Map<number, number>();
  for (const tx of sorted) {
    const dayIndex = Math.floor((Date.parse(tx.date) - startDay) / MS_PER_DAY);
    const delta = tx.type === 'CREDIT' ? tx.amount : -tx.amount;
    dailyDelta.set(dayIndex, (dailyDelta.get(dayIndex) ?? 0) + delta);
  }

  let balance = 0;
  let sumBalance = 0;
  let negativeDays = 0;
  for (let d = 0; d < windowDays; d++) {
    balance += dailyDelta.get(d) ?? 0;
    sumBalance += balance;
    if (balance < 0) negativeDays += 1;
  }

  return {
    netFlow: balance,
    avgMonthlyBalance: sumBalance / windowDays,
    negativeDaysRatio: negativeDays / windowDays,
    endBalance: balance,
  };
}
