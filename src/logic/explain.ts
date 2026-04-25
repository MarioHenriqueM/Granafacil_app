import type { ScoreResult } from './types.js';

export interface DecisionSummary {
  approved: boolean;
  limit?: number;
  denialReason?: string;
}

export function explainScore(score: ScoreResult, decision?: DecisionSummary): string {
  const { freq, reg, bal, circ } = score.raw;
  const parts: string[] = [
    `Score: ${score.score}/1000.`,
    `Frequência: ${freq.entriesPerMonth.toFixed(1)} entradas/mês.`,
    `Regularidade (CV dos intervalos): ${Number.isFinite(reg.coefficientOfVariation) ? reg.coefficientOfVariation.toFixed(2) : 'indefinida'}.`,
    `Saldo médio no período: R$ ${bal.avgMonthlyBalance.toFixed(2)}.`,
    `Dias com saldo negativo: ${(bal.negativeDaysRatio * 100).toFixed(0)}% do período.`,
  ];

  if (circ.pairsRemoved > 0) {
    parts.push(
      `Antifraude: ${circ.pairsRemoved} par(es) circular(es) neutralizados (${(circ.circularityRatio * 100).toFixed(0)}% dos créditos).`,
    );
  }

  if (decision) {
    if (decision.approved) {
      const limitTxt = decision.limit !== undefined ? `R$ ${decision.limit.toFixed(2)}` : 'a definir';
      parts.push(`Decisão: Aprovado com limite ${limitTxt}.`);
    } else {
      parts.push(`Decisão: Negado. Motivo: ${decision.denialReason ?? 'critério de risco não atendido'}.`);
    }
  }

  return parts.join(' ');
}
