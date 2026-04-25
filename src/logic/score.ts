import { computeBalance } from './balance.js';
import { filterCircular } from './circularity.js';
import { computeFrequency } from './frequency.js';
import { computeRegularity } from './regularity.js';
import type { CircularityConfig, Profile, ScoreResult, Weights } from './types.js';

const FREQ_FULL_SCORE_ENTRIES_PER_MONTH = 20;
const BALANCE_FULL_SCORE_BRL = 2000;
const MAX_SCORE = 1000;

const DEFAULT_CIRCULARITY: CircularityConfig = { tolerancePct: 0.01, maxRatio: 0.5 };

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function computeScore(
  profile: Profile,
  weights: Weights,
  antifraudConfig: CircularityConfig = DEFAULT_CIRCULARITY,
): ScoreResult {
  const circ = filterCircular(profile.transactions, antifraudConfig);
  const txs = circ.cleanedTransactions;

  const freq = computeFrequency(txs, profile.windowDays);
  const reg = computeRegularity(txs, profile.windowDays);
  const bal = computeBalance(txs, profile.windowDays);

  const frequency = clamp01(freq.entriesPerMonth / FREQ_FULL_SCORE_ENTRIES_PER_MONTH);
  const regularity = clamp01(reg.score);
  const balance = clamp01(bal.avgMonthlyBalance / BALANCE_FULL_SCORE_BRL);
  const diversity = 0;

  const w = weights.weights;
  const weighted = w.frequency * frequency + w.regularity * regularity + w.balance * balance + w.diversity * diversity;

  const negDays = Math.round(bal.negativeDaysRatio * profile.windowDays);
  const penalty = (negDays * Math.abs(weights.penalties.negativeBalanceDay)) / MAX_SCORE;

  const raw = clamp01(weighted - penalty);
  const score = Math.round(raw * MAX_SCORE);

  return {
    score,
    components: { frequency, regularity, balance, diversity },
    raw: { freq, reg, bal, circ },
  };
}
