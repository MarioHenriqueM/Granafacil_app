import { describe, expect, it } from 'vitest';
import { computeScore } from '../../src/logic/score.js';
import type { Profile, Weights } from '../../src/logic/types.js';
import weightsJson from '../../data/weights.json';

const weights = weightsJson as unknown as Weights;

const buildProfile = (partial: Partial<Profile>): Profile => ({
  profileId: 'test',
  persona: 'test',
  windowDays: 30,
  transactions: [],
  ...partial,
});

describe('computeScore', () => {
  it('produces score in [0, 1000]', () => {
    const p = buildProfile({
      transactions: [
        { date: '2026-01-01', type: 'CREDIT', amount: 200, source: 't' },
        { date: '2026-01-08', type: 'CREDIT', amount: 200, source: 't' },
      ],
    });
    const r = computeScore(p, weights);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1000);
  });

  it('gives higher score to a strong profile than to a weak one', () => {
    const strong = buildProfile({
      windowDays: 30,
      transactions: Array.from({ length: 15 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        type: 'CREDIT' as const,
        amount: 200,
        source: 'Uber',
      })),
    });
    const weak = buildProfile({
      windowDays: 30,
      transactions: [
        { date: '2026-01-01', type: 'DEBIT', amount: 50, source: 't' },
        { date: '2026-01-20', type: 'CREDIT', amount: 30, source: 't' },
      ],
    });
    const rStrong = computeScore(strong, weights);
    const rWeak = computeScore(weak, weights);
    expect(rStrong.score).toBeGreaterThan(rWeak.score);
  });

  it('returns components normalized to [0, 1]', () => {
    const p = buildProfile({
      transactions: [{ date: '2026-01-01', type: 'CREDIT', amount: 100, source: 't' }],
    });
    const r = computeScore(p, weights);
    for (const c of Object.values(r.components)) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it('produces score 0 for empty profile', () => {
    const p = buildProfile({});
    const r = computeScore(p, weights);
    expect(r.score).toBe(0);
  });

  it('applies negativeBalanceDay penalty (reduces score vs unpenalized twin)', () => {
    const withNegDays = buildProfile({
      transactions: [
        { date: '2026-01-01', type: 'DEBIT', amount: 50, source: 't' },
        { date: '2026-01-15', type: 'CREDIT', amount: 300, source: 't' },
        { date: '2026-01-22', type: 'CREDIT', amount: 300, source: 't' },
      ],
    });
    const noNegDays = buildProfile({
      transactions: [
        { date: '2026-01-01', type: 'CREDIT', amount: 300, source: 't' },
        { date: '2026-01-15', type: 'CREDIT', amount: 300, source: 't' },
        { date: '2026-01-22', type: 'CREDIT', amount: 300, source: 't' },
      ],
    });
    const a = computeScore(withNegDays, weights);
    const b = computeScore(noNegDays, weights);
    expect(a.score).toBeLessThan(b.score);
  });
});
