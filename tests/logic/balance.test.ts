import { describe, expect, it } from 'vitest';
import { computeBalance } from '../../src/logic/balance.js';
import type { Transaction } from '../../src/logic/types.js';

describe('computeBalance', () => {
  it('returns zero metrics for empty transactions', () => {
    const r = computeBalance([], 30);
    expect(r.netFlow).toBe(0);
    expect(r.avgMonthlyBalance).toBe(0);
    expect(r.negativeDaysRatio).toBe(0);
    expect(r.endBalance).toBe(0);
  });

  it('produces positive netFlow and zero negative days for credit-only', () => {
    const txs: Transaction[] = [
      { date: '2026-01-01', type: 'CREDIT', amount: 100, source: 't' },
      { date: '2026-01-10', type: 'CREDIT', amount: 200, source: 't' },
    ];
    const r = computeBalance(txs, 30);
    expect(r.netFlow).toBe(300);
    expect(r.negativeDaysRatio).toBe(0);
    expect(r.avgMonthlyBalance).toBeGreaterThan(0);
  });

  it('produces all negative days when balance starts with a debit', () => {
    const txs: Transaction[] = [
      { date: '2026-01-01', type: 'DEBIT', amount: 100, source: 't' },
    ];
    const r = computeBalance(txs, 30);
    expect(r.netFlow).toBe(-100);
    expect(r.negativeDaysRatio).toBe(1);
  });

  it('correctly counts partial negative days when credits recover balance', () => {
    const txs: Transaction[] = [
      { date: '2026-01-01', type: 'DEBIT', amount: 100, source: 't' },
      { date: '2026-01-11', type: 'CREDIT', amount: 300, source: 't' },
    ];
    const r = computeBalance(txs, 30);
    expect(r.negativeDaysRatio).toBeCloseTo(10 / 30, 5);
    expect(r.netFlow).toBe(200);
  });

  it('aggregates same-day transactions correctly', () => {
    const txs: Transaction[] = [
      { date: '2026-01-01', type: 'CREDIT', amount: 50, source: 't' },
      { date: '2026-01-01', type: 'CREDIT', amount: 70, source: 't' },
      { date: '2026-01-01', type: 'DEBIT', amount: 20, source: 't' },
    ];
    const r = computeBalance(txs, 10);
    expect(r.netFlow).toBe(100);
    expect(r.endBalance).toBe(100);
  });

  it('returns zero for non-positive window', () => {
    const txs: Transaction[] = [
      { date: '2026-01-01', type: 'CREDIT', amount: 100, source: 't' },
    ];
    const r = computeBalance(txs, 0);
    expect(r.netFlow).toBe(0);
    expect(r.negativeDaysRatio).toBe(0);
  });
});
