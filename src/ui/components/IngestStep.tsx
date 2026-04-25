import { useState, type FormEvent } from 'react';
import { api } from '../api.js';

interface Props {
  onIngested: (snapshotId: string, hash: string, persona: string) => void;
}

const PROFILES = [
  { id: 'aprovado-tipico', label: 'João Silva, 34 — motorista Uber estável (aprovação)' },
  { id: 'borderline', label: 'Borderline — entregador oscilante (limite no fio)' },
  { id: 'negado-tipico', label: 'Pedro Almeida, 28 — renda esporádica (negação)' },
  { id: 'fraude-circular', label: 'Fraude circular — PIX entra+sai no mesmo dia' },
];

export function IngestStep({ onIngested }: Props) {
  const [profileId, setProfileId] = useState(PROFILES[0]!.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await api.ingest(profileId);
      onIngested(r.snapshotId, r.hash, r.profile.persona);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ingerir perfil');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="ingest-title">
      <h2 id="ingest-title">2. Ingestão de perfil</h2>
      <p className="hint">
        Seleção de mock Open Finance. Na produção, substituído por integração BACEN (ver
        REQUIREMENTS §7.2).
      </p>
      <form onSubmit={onSubmit}>
        <label htmlFor="profile">
          Perfil de teste
          <select
            id="profile"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
          >
            {PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Ingerindo…' : 'Ingerir e analisar'}
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