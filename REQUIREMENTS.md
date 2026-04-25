# REQUIREMENTS — GranaFacil

> Documento de requisitos derivado de [PROJECT.md](PROJECT.md).
> Escopo: Alpha Version. Abordagem GSD (Get Stuff Done) + Data-Driven + Modularidade Estrita.

---

## 1. Objetivo

Entregar um motor de crédito comportamental para trabalhadores da economia gig, substituindo comprovantes de renda por análise de frequência e regularidade de ganhos, com decisão explicável e liquidação simulada via Pix.

---

## 2. Requisitos Funcionais (RF)

| ID | Requisito | Origem (PROJECT.md) |
|----|-----------|---------------------|
| RF-01 | O sistema deve ingerir perfis financeiros via mock de Open Finance (JSON em `data/`). | Core Loop → Ingestion |
| RF-02 | O motor deve calcular um score comportamental a partir de frequência, regularidade e saldo dinâmico. | High-Level Goals |
| RF-03 | O cálculo deve ler pesos, limites e presets de risco de arquivos em `config/`, sem hardcode no core. | System Architecture (Data-Driven) |
| RF-04 | O sistema deve emitir decisão binária (aprovado/negado) e um limite de crédito sugerido. | Core Loop → Action |
| RF-05 | Toda decisão deve gerar uma justificativa textual legível (explicabilidade). | High-Level Goals → Transparência |
| RF-06 | A UI deve expor um fluxo de consentimento LGPD antes de qualquer análise. | High-Level Goals → Fluxo de Consentimento |
| RF-07 | A UI deve exibir o score, o limite aprovado e a justificativa ao usuário final. | Vision → Lógica sobre Estética |
| RF-08 | O sistema deve simular trigger de pagamento Pix ao aprovar crédito (endpoint stub). | Core Loop → Action |
| RF-09 | Histórico de decisões deve ser persistido em PostgreSQL para auditoria. | Tech Stack → PostgreSQL |
| RF-10 | Handlers de integração externa (Uber/iFood/Bancos) devem ser isolados em `src/api/` com interface única. | System Architecture → api/ |
| RF-11 | O motor de score deve neutralizar transações circulares (CREDIT+DEBIT do mesmo valor no mesmo dia) antes de calcular frequência/regularidade/saldo, evitando inflação artificial por circulação de dinheiro. | Sinal de campo (fraude Alpha) |
| RF-12 | O endpoint de consentimento deve capturar e cruzar fingerprint de dispositivo (hash de device + hash de IP + user-agent) e bloquear criação de múltiplas contas a partir do mesmo aparelho/IP dentro de janela configurável. | Sinal de campo (fraude Alpha) |

---

## 3. Requisitos Não-Funcionais (RNF)

| ID | Categoria | Requisito | Trade-off / Justificativa |
|----|-----------|-----------|---------------------------|
| RNF-01 | Performance | Decisão de crédito deve retornar em ≤ 2s sob carga de teste. | Node.js é suficiente para as agregações; se surgir gargalo matemático, isolar em worker. |
| RNF-02 | Modularidade | Motor (`src/logic/`) não pode importar de `src/ui/` nem de `src/api/`. | Permite evolução independente do score (Vision → Modularidade Estrita). |
| RNF-03 | Explicabilidade | Score deve ser rule-based / transparente; **não** usar ML black-box no Alpha. | Atende RF-05 e mitiga risco regulatório LGPD/BACEN. |
| RNF-04 | Compliance | Consentimento explícito, granular e revogável; log imutável de consentimento. | Exigência LGPD (art. 7º, 8º, 9º). |
| RNF-05 | Segurança | Segredos (API keys, DB creds) apenas via variáveis de ambiente; **nunca** em `config/` versionado. | `config/` guarda parâmetros de risco — não credenciais. |
| RNF-06 | Observabilidade | Log estruturado (JSON) para cada decisão: inputs, pesos aplicados, score final. | Base para auditoria e tuning do motor. |
| RNF-07 | Testabilidade | `src/logic/` coberto por testes unitários ≥ 80%; fixtures em `data/`. | Garante estabilidade do core ao evoluir pesos. |
| RNF-08 | Deploy | CI/CD em Vercel (frontend) + Render (backend); build reprodutível. | Simplicidade operacional (PROJECT.md → Hospedagem). |
| RNF-09 | Stack | TypeScript estrito (`strict: true`) em todo `src/`. | Reduz bugs em domínio financeiro. |
| RNF-10 | Acessibilidade | UI mínima com contraste AA e navegação por teclado. | Público-alvo heterogêneo (gig workers). |

---

## 4. Regras de Negócio (RN)

- **RN-01** — O score considera janela móvel de 90 dias de transações mockadas.
- **RN-02** — Limite inicial de crédito: função (saldo_médio_mensal, frequência_entradas, desvio_padrão_entradas). Fórmula parametrizada em `config/risk-presets.json`.
- **RN-03** — Negação automática se: frequência de entradas < limiar mínimo OU saldo médio negativo em > 30% do período.
- **RN-04** — Aprovação gera registro `decision_log` (PostgreSQL) com hash do snapshot de dados usado.
- **RN-05** — Revogação de consentimento deve invalidar decisões futuras, mas preservar histórico de auditoria.
- **RN-06** — *Circularidade*: para cada dia UTC, pares CREDIT/DEBIT cujo valor absoluto difira em ≤ `tolerancePct` (padrão 1%) são removidos da série antes do score. Se `pairsRemoved / totalCredits > 0.5`, decisão é negada com motivo `CIRCULARITY_SUSPECT`. Parâmetros em `config/antifraud.json`.
- **RN-07** — *Device fingerprinting*: ao solicitar `/consent`, o sistema registra `{deviceHash?, ipHash, userAgent}` (IP armazenado como SHA-256 com salt — nunca em claro). Se em janela de `lookbackDays` (padrão 7d) o mesmo `deviceHash` aparece associado a > `maxUsersPerDevice` (padrão 3) usuários distintos, ou o mesmo `ipHash` a > `maxUsersPerIp` (padrão 20, tolerante por causa de CGNAT/coworking), a criação da conta é bloqueada com HTTP 429.

---

## 5. Estrutura de Pastas (contrato)

```
Granafacil/
├── config/               # constantes, limites, presets de risco, chaves (não versionadas)
│   ├── risk-presets.json
│   └── limits.json
├── data/                 # mocks Open Finance, pesos, dicionários de compliance
│   ├── profiles/*.json
│   ├── weights.json
│   └── compliance-rules.json
├── src/
│   ├── logic/            # motor de score (puro, sem IO)
│   ├── api/              # handlers externos + endpoints internos
│   └── ui/               # React components
├── tests/
├── PROJECT.md
├── REQUIREMENTS.md
├── ROADMAP.md
└── STATE.md
```

---

## 6. Trade-offs de Melhores Práticas

| Decisão | Escolha Alpha | Alternativa descartada | Motivo |
|---------|---------------|------------------------|--------|
| Linguagem do motor | TypeScript | Python (ML-friendly) | Alinhamento com PROJECT.md e stack única JS/TS; ML não é requisito Alpha. |
| Score | Rule-based parametrizado | ML supervisionado | Explicabilidade (RF-05) e compliance. |
| Pix | **Simulado** via stub | Integração PSP real | Requer parceria regulada (BACEN/PSP) — fora do escopo Alpha. |
| Open Finance | **Mock JSON** | Integração BACEN real | Requer DCR + homologação — fora do escopo Alpha. |
| ORM | Prisma (sugerido) | SQL puro / TypeORM | Type-safety + migrations reprodutíveis. |
| Testes | Vitest / Jest | Mocha | Integração nativa com TS e Vercel. |
| Config management | JSON estáticos em `config/` | Remote config service | Reduz dependências externas no Alpha. |

---

## 7. Inconsistências Técnicas & Pontos de Atenção

Verificação cruzada entre PROJECT.md e viabilidade real:

1. **⚠ Pix real não é entregável Alpha.** PROJECT.md cita "trigger de pagamento via Pix"; juridicamente exige parceria com PSP autorizado BACEN. → **Mitigação:** endpoint `POST /pix/simulate` devolvendo payload compatível; trilha para integração real é item pós-Alpha.
2. **⚠ Open Finance real não é entregável Alpha.** Exige DCR/certificado ICP-Brasil + homologação BACEN. → **Mitigação:** `data/profiles/*.json` seguindo o *schema oficial* do OFB (fase 2 — dados transacionais) para reduzir refactor futuro.
3. **⚠ "Node.js tem menor desempenho em cálculos pesados"** (PROJECT.md). → Para Alpha, agregações são O(n) sobre ~90 dias de transações: irrelevante. Flag de atenção caso o motor ganhe features de ML.
4. **⚠ LGPD não está explícita no PROJECT.md além de "consentimento".** Adicionado RNF-04, RN-05 e trilha de auditoria (RF-09) para cobrir direitos do titular (art. 18).
5. **⚠ `config/` mencionado como portador de "chaves de API".** Conflito com boas práticas de segurança. → Resolvido em **RNF-05**: `config/` só guarda parâmetros de risco; credenciais via `.env` (não versionado).
6. **⚠ Vercel + Render** — Vercel é serverless (cold start) e não é ideal para workers longos do motor. → **Mitigação:** motor no Render (long-lived Node); frontend no Vercel. Documentar boundary.
7. **⚠ Ausência de definição de autenticação de usuário.** Não especificado em PROJECT.md. → Adicionar na fase de hardening (ROADMAP Phase 6); Alpha pode usar magic-link ou OAuth social.
8. **⚠ Antifraude não previsto no PROJECT.md.** Sinais de campo (Alpha) mostraram circularidade artificial para inflar score e criação de múltiplas contas do mesmo aparelho. → Adicionado RF-11/RF-12 e RN-06/RN-07; implementação em Phase 8 (circularity filter + device fingerprinting). Base legal LGPD: prevenção à fraude / proteção ao crédito (art. 7º, IX e X).

---

## 8. Critérios de Aceite (Alpha)

- [ ] Um usuário de teste consegue passar pelo fluxo completo: consentir → ingerir mock → receber decisão + justificativa → ver simulação de Pix.
- [ ] Ajustar `config/risk-presets.json` altera o score **sem** mudança de código.
- [ ] Todas as decisões ficam auditáveis no PostgreSQL.
- [ ] Cobertura de testes unitários ≥ 80% em `src/logic/`.
- [ ] Deploy funcional em Vercel + Render.
