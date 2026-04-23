import { useCallback, useState } from 'react';
import { ConsentStep } from './components/ConsentStep.js';
import { DecisionStep } from './components/DecisionStep.js';
import { IngestStep } from './components/IngestStep.js';
import { PixStep } from './components/PixStep.js';
import type { DecisionResponse } from './api.js';

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
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [snapshotHash, setSnapshotHash] = useState<string>('');
  const [persona, setPersona] = useState<string>('');
  const [decision, setDecision] = useState<DecisionResponse | null>(null);

  const onConsent = useCallback(() => setStep('ingest'), []);

  const onIngested = useCallback((sid: string, hash: string, p: string) => {
    setSnapshotId(sid);
    setSnapshotHash(hash);
    setPersona(p);
    setStep('decision');
  }, []);

  const onDecided = useCallback((d: DecisionResponse) => setDecision(d), []);

  const currentIdx = STEP_ORDER.indexOf(step);

  return (
    <main className="app">
      <header>
        <h1>OpenScore GSD</h1>
        <p>Motor de crédito para a economia gig — Alpha</p>
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
        Versão 0.1.0-alpha · GSD · Dados mockados (Open Finance) · Pix simulado
      </footer>
    </main>
  );
}