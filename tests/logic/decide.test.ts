import { describe, expect, it } from 'vitest';
import { decide, type LimitsConfig } from '../../src/logic/decide.js';
import type { AntifraudConfig, Profile, RiskPreset, Weights } from '../../src/logic/types.js';
import weightsJson from '../../data/weights.json';
import limitsJson from '../../config/limits.json';
import presetsJson from '../../config/risk-presets.json';
import antifraudJson from '../../config/antifraud.json';
import fraudeCircular from '../../data/profiles/fraude-circular.json';

const weights = weightsJson as unknown as Weights;
const limits = limitsJson as unknown as LimitsConfig;
const preset = (presetsJson.presets as Record<string, RiskPreset>)[presetsJson.activePreset]!;
const antifraud = antifraudJson as unknown as AntifraudConfig;

const mkProfile = (transactions: Profile['transactions'], windowDays = 30): Profile => ({
  profileId: 't',
  persona: 't',
  windowDays,
  transactions,
});

describe('decide', () => {
  it('denies with INSUFFICIENT_DATA for too few transactions', () => {
    const p = mkProfile([
      { date: '2026-01-01', type: 'CREDIT', amount: 100, source: 't' },
    ]);
    const d = decide(p, weights, preset, limits);
    expect(d.approved).toBe(false);
    expect(d.denialReason).toBe('INSUFFICIENT_DATA');
  });

  it('denies with LOW_FREQUENCY when entries/month below preset minimum', () => {
    const txs = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-01-${String((i * 3) + 1).padStart(2, '0')}`,
      type: 'CREDIT' as const,
      amount: 300,
      source: 't',
    }));
    const lowFreqPreset: RiskPreset = { ...preset, minFrequencyEntriesPerMonth: 100 };
    const d = decide(mkProfile(txs, 30), weights, lowFreqPreset, limits);
    expect(d.approved).toBe(false);
    expect(d.denialReason).toBe('LOW_FREQUENCY');
  });

  it('denies with NEGATIVE_BALANCE when negativeDaysRatio exceeds preset cap', () => {
    const txs: Profile['transactions'] = [
      { date: '2026-01-01', type: 'DEBIT', amount: 500, source: 't' },
      ...Array.from({ length: 10 }, (_, i) => ({
        date: `2026-01-${String(i + 2).padStart(2, '0')}`,
        type: 'CREDIT' as const,
        amount: 50,
        source: 't',
      })),
    ];
    const d = decide(mkProfile(txs, 30), weights, preset, limits);
    expect(d.approved).toBe(false);
    expect(d.denialReason).toBe('NEGATIVE_BALANCE');
  });

  it('denies with LOW_SCORE when score below threshold but other gates pass', () => {
    const txs = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      type: 'CREDIT' as const,
      amount: 50,
      source: 't',
    }));
    const strictPreset: RiskPreset = { ...preset, approvalThreshold: 999 };
    const d = decide(mkProfile(txs, 30), weights, strictPreset, limits);
    expect(d.approved).toBe(false);
    expect(d.denialReason).toBe('LOW_SCORE');
  });

  it('approves a strong profile with creditLimit in [minLimit, maxLimit]', () => {
    const txs = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      type: 'CREDIT' as const,
      amount: 250,
      source: 't',
    }));
    const d = decide(mkProfile(txs, 30), weights, preset, limits);
    expect(d.approved).toBe(true);
    expect(d.creditLimit).toBeGreaterThanOrEqual(limits.credit.minLimit);
    expect(d.creditLimit).toBeLessThanOrEqual(limits.credit.maxLimit);
    expect(d.denialReason).toBeUndefined();
  });

  it('rounds creditLimit to multiple of 50', () => {
    const txs = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      type: 'CREDIT' as const,
      amount: 250,
      source: 't',
    }));
    const d = decide(mkProfile(txs, 30), weights, preset, limits);
    expect(d.creditLimit! % 50).toBe(0);
  });

  it('denies fraude-circular fixture with CIRCULARITY_SUSPECT', () => {
    const profile = fraudeCircular as unknown as Profile;
    const d = decide(profile, weights, preset, limits, antifraud.circularity);
    expect(d.approved).toBe(false);
    expect(d.denialReason).toBe('CIRCULARITY_SUSPECT');
    expect(d.scoreResult.raw.circ.pairsRemoved).toBeGreaterThanOrEqual(10);
    expect(d.scoreResult.raw.circ.circularityRatio).toBeGreaterThan(0.5);
  });

  it('denies with LOW_BALANCE when avgMonthlyBalance below preset minimum', () => {
    const txs = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      type: 'CREDIT' as const,
      amount: 10,
      source: 't',
    }));
    const strictBalancePreset: RiskPreset = { ...preset, minAvgMonthlyBalance: 10000 };
    const d = decide(mkProfile(txs, 30), weights, strictBalancePreset, limits);
    expect(d.approved).toBe(false);
    expect(d.denialReason).toBe('LOW_BALANCE');
  });
});
