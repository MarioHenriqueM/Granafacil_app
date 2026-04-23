import { describe, expect, it } from 'vitest';
import { explainScore } from '../../src/logic/explain.js';
import { computeScore } from '../../src/logic/score.js';
import type { Profile, Weights } from '../../src/logic/types.js';
import weightsJson from '../../data/weights.json';

const weights = weightsJson as unknown as Weights;

const profile: Profile = {
  profileId: 'test',
  persona: 'test',
  windowDays: 30,
  transactions: [
    { date: '2026-01-01', type: 'CREDIT', amount: 200, source: 'Uber' },
    { date: '2026-01-08', type: 'CREDIT', amount: 200, source: 'Uber' },
    { date: '2026-01-15', type: 'CREDIT', amount: 200, source: 'iFood' },
  ],
};

describe('explainScore', () => {
  it('includes all expected metric fields', () => {
    const s = computeScore(profile, weights);
    const text = explainScore(s);
    expect(text).toContain('Score:');
    expect(text).toContain('Frequência:');
    expect(text).toContain('Regularidade');
    expect(text).toContain('Saldo médio');
    expect(text).toContain('Dias com saldo negativo');
  });

  it('appends approval decision when provided', () => {
    const s = computeScore(profile, weights);
    const text = explainScore(s, { approved: true, limit: 500 });
    expect(text).toContain('Aprovado');
    expect(text).toContain('500');
  });

  it('appends denial reason when provided', () => {
    const s = computeScore(profile, weights);
    const text = explainScore(s, { approved: false, denialReason: 'LOW_FREQUENCY' });
    expect(text).toContain('Negado');
    expect(text).toContain('LOW_FREQUENCY');
  });

  it('handles undefined limit on approval gracefully', () => {
    const s = computeScore(profile, weights);
    const text = explainScore(s, { approved: true });
    expect(text).toContain('Aprovado');
    expect(text).toContain('a definir');
  });

  it('uses fallback denial reason when omitted', () => {
    const s = computeScore(profile, weights);
    const text = explainScore(s, { approved: false });
    expect(text).toContain('critério de risco');
  });

  it('labels CV as indefinida when non-finite', () => {
    const empty: Profile = { ...profile, transactions: [] };
    const s = computeScore(empty, weights);
    const text = explainScore(s);
    expect(text).toContain('indefinida');
  });
});
