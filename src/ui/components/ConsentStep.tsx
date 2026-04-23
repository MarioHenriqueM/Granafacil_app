import { useState, type FormEvent } from 'react';
import { api } from '../api.js';

interface Props {
  onGranted: () => void;
}

const SCOPES = [
  { key: 'openFinance', label: 'Dados transacionais via Open Finance (fase 2)' },
  { key: 'gigIncome', label: 'Histórico de ganhos em apps parceiros (Uber, iFood)' },
  { key: 'identity', label: 'Identificação pessoal (e-mail de contato)' },
] as const;

export function ConsentStep({ onGranted }: Props) {
  const [email, setEmail] = useState('');
  const [scope, setScope] = useState<Record<string, boolean>>({
    openFinance: true,
    gigIncome: true,
    identity: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.grantConsent(email, scope);
      onGranted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar consentimento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="consent-title">
      <h2 id="consent-title">1. Consentimento LGPD</h2>
      <p className="hint">
        Autorize o uso dos dados abaixo. Você pode revogar a qualquer momento, preservando o
        histórico de auditoria (RN-05).
      </p>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">
          E-mail
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <fieldset>
          <legend>Escopo dos dados</legend>
          {SCOPES.map((s) => (
            <div key={s.key} className="checkbox-row">
              <input
                id={`scope-${s.key}`}
                type="checkbox"
                checked={scope[s.key] ?? false}
                onChange={(e) => setScope({ ...scope, [s.key]: e.target.checked })}
              />
              <label htmlFor={`scope-${s.key}`}>{s.label}</label>
            </div>
          ))}
        </fieldset>

        <button type="submit" disabled={loading || !email}>
          {loading ? 'Registrando…' : 'Autorizar e continuar'}
        </button>
        {error && (
          <p className="status" data-kind="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}