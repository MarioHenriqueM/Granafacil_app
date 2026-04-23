import { describe, expect, it } from 'vitest';
import { computeFrequency } from '../../src/logic/frequency.js';
import type { Transaction } from '../../src/logic/types.js';

const credit = (date: string, amount = 100): Transaction => ({
  date,
  type: 'CREDIT',
  amount,
  source: 'test',
});

describe('computeFrequency', () => {
  it('returns zero metrics for empty transactions', () => {
    const r = computeFrequency([], 90);
    expect(r.totalCredits).toBe(0);
    expect(r.entriesPerMonth).toBe(0);
    expect(r.meanGapDays).toBe(0);
    expect(r.stdDevGapDays).toBe(0);
  });

  it('ignores DEBIT transactions', () => {
    const txs: Transaction[] = [
      { date: '2026-01-01', type: 'DEBIT', amount: 50, source: 'test' },
      credit('2026-01-05'),
    ];
    const r = computeFrequency(txs, 30);
    expect(r.totalCredits).toBe(1);
  });

  it('computes entries/month proportional to window', () => {
    const txs = [credit('2026-01-01'), credit('2026-01-08'), credit('2026-01-15')];
    const r = computeFrequency(txs, 30);
    expect(r.entriesPerMonth).toBeCloseTo(3, 5);
  });

  it('computes low stddev for regular weekly entries', () => {
    const txs = [
      credit('2026-01-01'),
      credit('2026-01-08'),
      credit('2026-01-15'),
      credit('2026-01-22'),
    ];
    const r = computeFrequency(txs, 30);
    expect(r.meanGapDays).toBeCloseTo(7, 5);
    expect(r.stdDevGapDays).toBeLessThan(0.01);
  });

  it('computes high stddev for irregular entries', () => {
    const txs = [credit('2026-01-01'), credit('2026-01-02'), credit('2026-01-20')];
    const r = computeFrequency(txs, 30);
    expect(r.stdDevGapDays).toBeGreaterThan(5);
  });

  it('returns zero gaps for single credit', () => {
    const r = computeFrequency([credit('2026-01-01')], 30);
    expect(r.totalCredits).toBe(1);
    expect(r.meanGapDays).toBe(0);
    expect(r.stdDevGapDays).toBe(0);
  });

  it('returns zero entries/month for zero-length window', () => {
    const r = computeFrequency([credit('2026-01-01')], 0);
    expect(r.entriesPerMonth).toBe(0);
  });
});
