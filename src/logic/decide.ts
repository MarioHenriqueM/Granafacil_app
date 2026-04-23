import { computeScore } from './score.js';
import type { Profile, RiskPreset, ScoreResult, Weights } from './types.js';

export interface LimitsConfig {
  credit: {
    minLimit: number;
    maxLimit: number;
    defaultLimit: number;
    currency: string;
  };
  analysis: {
    windowDays: number;
    minTransactionsRequired: number;
  };
  score: {
    minScore: number;
    maxScore: number;
  };
}

export type DenialReason =
  | 'INSUFFICIENT_DATA'
  | 'LOW_FREQUENCY'
  | 'NEGATIVE_BALANCE'
  | 'LOW_BALANCE'
  | 'LOW_SCORE';

export interface Decision {
  approved: boolean;
  score: number;
  creditLimit?: number;
  denialReason?: DenialReason;
  scoreResult: ScoreResult;
}

const LIMIT_STEP = 50;

export function decide(
  profile: Profile,
  weights: Weights,
  preset: RiskPreset,
  limits: LimitsConfig,
): Decision {
  const scoreResult = computeScore(profile, weights);
  const { score } = scoreResult;
  const { freq, bal } = scoreResult.raw;

  if (profile.transactions.length < limits.analysis.minTransactionsRequired) {
    return { approved: false, score, denialReason: 'INSUFFICIENT_DATA', scoreResult };
  }
  if (freq.entriesPerMonth < preset.minFrequencyEntriesPerMonth) {
    return { approved: false, score, denialReason: 'LOW_FREQUENCY', scoreResult };
  }
  if (bal.negativeDaysRatio > preset.maxNegativeDaysRatio) {
    return { approved: false, score, denialReason: 'NEGATIVE_BALANCE', scoreResult };
  }
  if (bal.avgMonthlyBalance < preset.minAvgMonthlyBalance) {
    return { approved: false, score, denialReason: 'LOW_BALANCE', scoreResult };
  }
  if (score < preset.approvalThreshold) {
    return { approved: false, score, denialReason: 'LOW_SCORE', scoreResult };
  }

  const { minLimit, maxLimit } = limits.credit;
  const ratio = score / limits.score.maxScore;
  const rawLimit = minLimit + ratio * (maxLimit - minLimit);
  const creditLimit = Math.round(rawLimit / LIMIT_STEP) * LIMIT_STEP;

  return { approved: true, score, creditLimit, scoreResult };
}
