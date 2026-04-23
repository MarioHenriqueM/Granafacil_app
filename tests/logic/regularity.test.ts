import { describe, expect, it } from 'vitest';
import { computeRegularity } from '../../src/logic/regularity.js';
import type { Transaction } from '../../src/logic/types.js';

const credit = (date: string): Transaction => ({
  date,
  type: 'CREDIT',
  amount: 100,
  source: 'test',
});

describe('computeRegularity', () => {
  it('returns zero score for insufficient data', () => {
    const r = computeRegularity([], 30);
    expect(r.score).toBe(0);
    expect(r.coefficientOfVariation).toBe(Infinity);
  });

  it('approaches 1.0 for perfectly regular gaps', () => {
    const txs = [
      credit('2026-01-01'),
      credit('2026-01-08'),
      credit('2026-01-15'),
      credit('2026-01-22'),
    ];
    const r = computeRegularity(txs, 30);
    expect(r.coefficientOfVariation).toBeCloseTo(0, 5);
    expect(r.score).toBeCloseTo(1, 5);
  });

  it('produces lower score for irregular gaps', () => {
    const regular = [credit('2026-01-01'), credit('2026-01-08'), credit('2026-01-15')];
    const irregular = [credit('2026-01-01'), credit('2026-01-02'), credit('2026-01-20')];
    const rRegular = computeRegularity(regular, 30);
    const rIrregular = computeRegularity(irregular, 30);
    expect(rIrregular.score).toBeLessThan(rRegular.score);
  });

  it('yields score in [0,1] range for any finite CV', () => {
    const txs = [credit('2026-01-01'), credit('2026-01-02'), credit('2026-01-30')];
    const r = computeRegularity(txs, 30);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });
});
