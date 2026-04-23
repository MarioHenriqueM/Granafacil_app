import { useEffect, useState } from 'react';
import { api, type DecisionResponse } from '../api.js';

interface Props {
  snapshotId: string;
  snapshotHash: string;
  persona: string;
  onDecided: (decision: DecisionResponse) => void;
}

export function DecisionStep({ snapshotId, snapshotHash, persona, onDecided }: Props) {
  const [result, setResult] = useState<DecisionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .decide(snapshotId)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        onDecided(r);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Falha ao decidir');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [snapshotId, onDecided]);

  return (
    <section className="panel" aria-labelledby="decision-title" aria-live="polite">
      <h2 id="decision-title">3. Decisão de crédito</h2>
      <p className="hint">
        Perfil: <strong>{persona}</strong> · snapshot <code>{snapshotHash.slice(0, 12)}…</code>
      </p>

      {loading && <p className="status">Calculando score…</p>}
      {error && (
        <p className="status" data-kind="error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <>
          <dl className="result">
            <dt>Score</dt>
            <dd>
              <strong>{result.score}</strong> / 1000
            </dd>
            <dt>Decisão</dt>
            <dd>
              {result.approved ? (
                <span style={{ color: 'var(--ok)' }}>Aprovado</span>
              ) : (
                <span style={{ color: 'var(--err)' }}>
                  Negado ({result.denialReason ?? 'motivo não informado'})
                </span>
              )}
            </dd>
            {result.approved && result.creditLimit !== undefined && (
              <>
                <dt>Limite sugerido</dt>
                <dd>R$ {result.creditLimit.toFixed(2)}</dd>
              </>
            )}
            <dt>Hash</dt>
            <dd>
              <code>{result.rowHash.slice(0, 16)}…</code>
            </dd>
          </dl>
          <p className="explanation">{result.explanation}</p>
        </>
      )}
    </section>
  );
}