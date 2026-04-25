import { useCallback, useState } from 'react';
import { ConsentStep } from './components/ConsentStep.js';
import { DecisionStep } from './components/DecisionStep.js';
import { IngestStep } from './components/IngestStep.js';
import { PixStep } from './components/PixStep.js';
import { api, type DecisionResponse } from './api.js';

type Step = 'consent' | 'ingest' | 'decision' | 'pix';

const STEP_LABELS: Record<Step, string> = {
  consent: 'Consentimento',
  ingest: 'Ingestão',
  decision: 'Decisão',
  pix: 'Pix',
};

const STEP_ORDER: Step[] = ['consent', 'ingest', 'decision', 'pix'];

export function App() {
  const [step, setStep] = useState<Step>('consent');
  const [email, setEmail] = useState<string>('');
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [snapshotHash, setSnapshotHash] = useState<string>('');
  const [persona, setPersona] = useState<string>('');
  const [decision, setDecision] = useState<DecisionResponse | null>(null);

  const onConsent = useCallback((grantedEmail: string) => {
    setEmail(grantedEmail);
    setStep('ingest');
  }, []);

  const onIngested = useCallback((sid: string, hash: string, p: string) => {
    setSnapshotId(sid);
    setSnapshotHash(hash);
    setPersona(p);
    setStep('decision');
  }, []);

  const onDecided = useCallback((d: DecisionResponse) => setDecision(d), []);

  const onReset = useCallback(() => {
    api.clearSession();
    setEmail('');
    setSnapshotId(null);
    setSnapshotHash('');
    setPersona('');
    setDecision(null);
    setStep('consent');
  }, []);

  const currentIdx = STEP_ORDER.indexOf(step);
  const hasSession = email !== '' || snapshotId !== null;

  return (
    <main className="app">
      <header>
        <div className="header-row">
          <div>
            <h1>GranaFacil</h1>
            <p>Motor de crédito para a economia gig — Alpha</p>
          </div>
          {hasSession && (
            <button
              type="button"
              className="secondary reset-btn"
              onClick={onReset}
              aria-label="Reiniciar demo (limpa sessão e estado local)"
            >
              Reiniciar demo
            </button>
          )}
        </div>
        {hasSession && (
          <div className="session-badge" role="status" aria-live="polite">
            {email && (
              <span>
                Sessão: <strong>{email}</strong>
              </span>
            )}
            {persona && (
              <span>
                Perfil: <strong>{persona}</strong>
              </span>
            )}
          </div>
        )}
      </header>

      <nav aria-label="Progresso">
        <ol className="steps">
          {STEP_ORDER.map((s, i) => (
            <li
              key={s}
              aria-current={s === step ? 'step' : undefined}
              data-done={i < currentIdx ? 'true' : undefined}
            >
              {i + 1}. {STEP_LABELS[s]}
            </li>
          ))}
        </ol>
      </nav>

      {step === 'consent' && <ConsentStep onGranted={onConsent} />}

      {step === 'ingest' && <IngestStep onIngested={onIngested} />}

      {step === 'decision' && snapshotId && (
        <>
          <DecisionStep
            snapshotId={snapshotId}
            snapshotHash={snapshotHash}
            persona={persona}
            onDecided={onDecided}
          />
          {decision && (
            <button
              type="button"
              className="secondary"
              onClick={() => setStep('pix')}
            >
              Prosseguir para Pix
            </button>
          )}
        </>
      )}

      {step === 'pix' && decision && <PixStep decision={decision} />}

      <footer>
        Versão 0.1.0-alpha · Dados mockados (Open Finance) · Pix simulado
      </footer>
    </main>
  );
}
