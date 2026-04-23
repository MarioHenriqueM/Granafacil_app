import { useState } from 'react';
import { api, type DecisionResponse, type PixResponse } from '../api.js';

interface Props {
  decision: DecisionResponse;
}

export function PixStep({ decision }: Props) {
  const [pix, setPix] = useState<PixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!decision.approved) {
    return (
      <section className="panel" aria-labelledby="pix-title">
        <h2 id="pix-title">4. Simulação Pix</h2>
        <p className="status" data-kind="error">
          Crédito não aprovado — trigger Pix bloqueado.
        </p>
      </section>
    );
  }

  async function trigger() {
    setError(null);
    setLoading(true);
    try {
      const r = await api.simulatePix(decision.decisionId);
      setPix(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na simulação');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="pix-title" aria-live="polite">
      <h2 id="pix-title">4. Simulação Pix</h2>
      <p className="hint">
        Dispara um payload compatível com PSP real. Integração produtiva requer parceria BACEN (ver
        REQUIREMENTS §7.1).
      </p>

      {!pix && (
        <button type="button" onClick={trigger} disabled={loading}>
          {loading ? 'Simulando…' : `Simular Pix de R$ ${decision.creditLimit?.toFixed(2) ?? '—'}`}
        </button>
      )}

      {error && (
        <p className="status" data-kind="error" role="alert">
          {error}
        </p>
      )}

      {pix && (
        <>
          <p className="status" data-kind="ok">
            Simulação concluída.
          </p>
          <dl className="result">
            <dt>txid</dt>
            <dd>
              <code>{pix.txid}</code>
            </dd>
            <dt>Valor</dt>
            <dd>R$ {pix.valor}</dd>
            <dt>Status</dt>
            <dd>{pix.status}</dd>
            <dt>Chave</dt>
            <dd>
              <code>{pix.chave}</code>
            </dd>
            <dt>Criado em</dt>
            <dd>{new Date(pix.criadoEm).toLocaleString('pt-BR')}</dd>
          </dl>
          <p className="explanation">{pix.disclaimer}</p>
        </>
      )}
    </section>
  );
}