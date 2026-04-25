export type TransactionType = 'CREDIT' | 'DEBIT';

export interface Transaction {
  date: string;
  type: TransactionType;
  amount: number;
  source: string;
}

export interface Profile {
  profileId: string;
  persona: string;
  windowDays: number;
  transactions: Transaction[];
}

export interface Weights {
  weights: {
    frequency: number;
    regularity: number;
    balance: number;
    diversity: number;
  };
  penalties: {
    negativeBalanceDay: number;
    longGapBetweenEntries: number;
  };
}

export interface RiskPreset {
  minFrequencyEntriesPerMonth: number;
  maxNegativeDaysRatio: number;
  minAvgMonthlyBalance: number;
  approvalThreshold: number;
}

export interface FrequencyResult {
  entriesPerMonth: number;
  totalCredits: number;
  meanGapDays: number;
  stdDevGapDays: number;
}

export interface RegularityResult {
  coefficientOfVariation: number;
  score: number;
}

export interface BalanceResult {
  netFlow: number;
  avgMonthlyBalance: number;
  negativeDaysRatio: number;
  endBalance: number;
}

export interface CircularityResult {
  pairsRemoved: number;
  totalCreditsOriginal: number;
  circularityRatio: number;
  cleanedTransactions: Transaction[];
}

export interface CircularityConfig {
  tolerancePct: number;
  maxRatio: number;
}

export interface AntifraudConfig {
  circularity: CircularityConfig;
  deviceFingerprint: {
    lookbackDays: number;
    maxUsersPerDevice: number;
    maxUsersPerIp: number;
  };
}

export interface ScoreResult {
  score: number;
  components: {
    frequency: number;
    regularity: number;
    balance: number;
    diversity: number;
  };
  raw: {
    freq: FrequencyResult;
    reg: RegularityResult;
    bal: BalanceResult;
    circ: CircularityResult;
  };
}
