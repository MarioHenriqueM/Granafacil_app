import { describe, expect, it } from 'vitest';
import { filterCircular } from '../../src/logic/circularity.js';
import type { CircularityConfig, Transaction } from '../../src/logic/types.js';

const cfg: CircularityConfig = { tolerancePct: 0.01, maxRatio: 0.5 };

function tx(date: string, type: 'CREDIT' | 'DEBIT', amount: number, source = 'x'): Transaction {
  return { date, type, amount, source };
}

describe('filterCircular', () => {
  it('removes a perfect same-day CREDIT+DEBIT pair with equal amount', () => {
    const txs = [tx('2026-01-10', 'CREDIT', 500), tx('2026-01-10', 'DEBIT', 500)];
    const r = filterCircular(txs, cfg);
    expect(r.pairsRemoved).toBe(1);
    expect(r.cleanedTransactions).toHaveLength(0);
    expect(r.circularityRatio).toBe(1);
  });

  it('removes a pair whose amounts differ within tolerance', () => {
    const txs = [tx('2026-01-10', 'CREDIT', 500), tx('2026-01-10', 'DEBIT', 502)];
    const r = filterCircular(txs, cfg);
    expect(r.pairsRemoved).toBe(1);
    expect(r.cleanedTransactions).toHaveLength(0);
  });

  it('keeps pair whose amounts differ beyond tolerance', () => {
    const txs = [tx('2026-01-10', 'CREDIT', 500), tx('2026-01-10', 'DEBIT', 520)];
    const r = filterCircular(txs, cfg);
    expect(r.pairsRemoved).toBe(0);
    expect(r.cleanedTransactions).toHaveLength(2);
  });

  it('matches multiple pairs on the same day greedily', () => {
    const txs = [
      tx('2026-01-10', 'CREDIT', 500),
      tx('2026-01-10', 'CREDIT', 300),
      tx('2026-01-10', 'DEBIT', 500),
      tx('2026-01-10', 'DEBIT', 300),
    ];
    const r = filterCircular(txs, cfg);
    expect(r.pairsRemoved).toBe(2);
    expect(r.cleanedTransactions).toHaveLength(0);
  });

  it('does not pair across different days even if amounts match', () => {
    const txs = [tx('2026-01-10', 'CREDIT', 500), tx('2026-01-11', 'DEBIT', 500)];
    const r = filterCircular(txs, cfg);
    expect(r.pairsRemoved).toBe(0);
    expect(r.cleanedTransactions).toHaveLength(2);
  });

  it('returns empty result for empty input', () => {
    const r = filterCircular([], cfg);
    expect(r.pairsRemoved).toBe(0);
    expect(r.totalCreditsOriginal).toBe(0);
    expect(r.circularityRatio).toBe(0);
    expect(r.cleanedTransactions).toHaveLength(0);
  });

  it('preserves original order for non-removed transactions', () => {
    const txs = [
      tx('2026-01-10', 'CREDIT', 200, 'uber'),
      tx('2026-01-10', 'CREDIT', 500, 'fraude'),
      tx('2026-01-10', 'DEBIT', 80, 'gasolina'),
      tx('2026-01-10', 'DEBIT', 500, 'fraude'),
    ];
    const r = filterCircular(txs, cfg);
    expect(r.pairsRemoved).toBe(1);
    expect(r.cleanedTransactions.map((t) => t.source)).toEqual(['uber', 'gasolina']);
  });

  it('handles CREDIT without matching DEBIT (no removal)', () => {
    const txs = [tx('2026-01-10', 'CREDIT', 500), tx('2026-01-10', 'DEBIT', 100)];
    const r = filterCircular(txs, cfg);
    expect(r.pairsRemoved).toBe(0);
    expect(r.cleanedTransactions).toHaveLength(2);
  });
});
