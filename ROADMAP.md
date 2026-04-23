# ROADMAP — OpenScore GSD

> Framework: **GSD (Get Stuff Done)** — entregas atômicas, funcionais e verificáveis.
> Derivado de [PROJECT.md](PROJECT.md) e [REQUIREMENTS.md](REQUIREMENTS.md).
> Estado atual: ver [STATE.md](STATE.md).

Legenda de status: `pending` · `in-progress` · `blocked` · `done`

---

<phase id="1" name="Planning & Scaffolding">
  <objective>Fundação do repositório e contratos de estrutura (src/, data/, config/).</objective>

  <task id="1.1">
    <title>Inicializar repositório Node.js + TypeScript (strict)</title>
    <deliverable>package.json, tsconfig.json, .editorconfig, .gitignore</deliverable>
    <status>done</status>
  </task>

  <task id="1.2">
    <title>Criar estrutura de pastas conforme REQUIREMENTS §5</title>
    <deliverable>config/, data/, src/logic/, src/api/, src/ui/, tests/</deliverable>
    <status>done</status>
  </task>

  <task id="1.3">
    <title>Definir schema inicial de config/risk-presets.json e config/limits.json</title>
    <deliverable>config/*.json com placeholders comentados</deliverable>
    <status>done</status>
  </task>

  <task id="1.4">
    <title>Criar data/profiles/*.json seguindo schema OFB fase 2 (transacional)</title>
    <deliverable>3 perfis mock: aprovado-típico, negado-típico, borderline</deliverable>
    <status>done</status>
  </task>

  <task id="1.5">
    <title>Configurar linter, formatter e Vitest</title>
    <deliverable>ESLint + Prettier + vitest.config.ts</deliverable>
    <status>done</status>
    <note>ESLint deferido — TS strict + noUnusedLocals/Parameters + Prettier + Vitest cobrem lint/format/testes no Alpha. Revisitar em Phase 5 se necessário.</note>
  </task>
</phase>

---

<phase id="2" name="Core Scoring Engine">
  <objective>Motor puro em src/logic/ — parametrizado por config/ e data/, sem IO.</objective>

  <task id="2.1">
    <title>Implementar src/logic/frequency.ts (entradas/mês, desvio padrão)</title>
    <deliverable>Função pura + testes com fixtures de data/profiles/</deliverable>
    <status>done</status>
  </task>

  <task id="2.2">
    <title>Implementar src/logic/regularity.ts (consistência temporal)</title>
    <deliverable>Função pura + testes</deliverable>
    <status>done</status>
  </task>

  <task id="2.3">
    <title>Implementar src/logic/balance.ts (saldo dinâmico, dias negativos)</title>
    <deliverable>Função pura + testes</deliverable>
    <status>done</status>
  </task>

  <task id="2.4">
    <title>Implementar src/logic/score.ts — composição via pesos de data/weights.json</title>
    <deliverable>Score final [0–1000] + testes de regressão</deliverable>
    <status>done</status>
  </task>

  <task id="2.5">
    <title>Implementar src/logic/explain.ts — gera justificativa textual</title>
    <deliverable>Ex.: "Aprovado: frequência estável (±5%) e saldo positivo em 87% dos dias"</deliverable>
    <status>done</status>
  </task>

  <task id="2.6">
    <title>Atingir cobertura ≥ 80% em src/logic/ (RNF-07)</title>
    <deliverable>Relatório Vitest coverage</deliverable>
    <status>done</status>
    <note>Atingido 100% em statements/branches/functions/lines (28 testes).</note>
  </task>
</phase>

---

<phase id="3" name="API Layer & Persistence">
  <objective>Expor o motor via HTTP e persistir decisões auditáveis.</objective>

  <task id="3.1">
    <title>Configurar PostgreSQL + Prisma (schema: users, consents, decision_log)</title>
    <deliverable>prisma/schema.prisma + migration inicial</deliverable>
    <status>done</status>
    <note>SQLite escolhido para Alpha (Prisma 6, migração `20260422202818_init`). Postgres é alvo de produção — troca de `provider` no schema + migration reset. Ver STATE.md §Desvios.</note>
  </task>

  <task id="3.2">
    <title>Implementar src/api/ingest.ts — carrega mock de data/profiles/</title>
    <deliverable>POST /ingest { profileId } → snapshot persistido</deliverable>
    <status>done</status>
    <note>Validação path-traversal do profileId. Cria linha em `Snapshot` com SHA-256 do payload.</note>
  </task>

  <task id="3.3">
    <title>Implementar src/api/decision.ts — orquestra logic/ + grava decision_log</title>
    <deliverable>POST /decision → { score, approved, limit, explanation }</deliverable>
    <status>done</status>
    <note>Orquestra `logic/decide.ts` (função pura, 7 testes). Persiste em `DecisionLog`.</note>
  </task>

  <task id="3.4">
    <title>Implementar src/api/consent.ts — registro LGPD imutável (RNF-04)</title>
    <deliverable>POST /consent, GET /consent/:userId, DELETE /consent/:userId</deliverable>
    <status>done</status>
  </task>

  <task id="3.5">
    <title>Stub src/api/pix.ts — simula trigger (ver REQUIREMENTS §7.1)</title>
    <deliverable>POST /pix/simulate retorna payload compatível com PSP real</deliverable>
    <status>done</status>
    <note>Gate: só dispara se decisão aprovada. Payload inclui `disclaimer` sobre parceria PSP real.</note>
  </task>

  <task id="3.6">
    <title>Logs estruturados JSON em todas as rotas (RNF-06)</title>
    <deliverable>Middleware de logging</deliverable>
    <status>done</status>
    <note>Pino via Fastify logger; eventos explícitos `consent.granted`, `consent.revoked`, `ingest.snapshot`, `decision.created`, `pix.simulated`.</note>
  </task>
</phase>

---

<phase id="4" name="UI & Consent Flow">
  <objective>Interface React mínima e funcional — Lógica sobre Estética.</objective>

  <task id="4.1">
    <title>Bootstrap React em src/ui/ (Vite + TS)</title>
    <deliverable>App shell + roteamento</deliverable>
    <status>done</status>
    <note>Vite 5 + React 19 + @vitejs/plugin-react 4. Config em `vite.config.ts` (root=src/ui, proxy para :3000). `vite build` limpo (201kB gzipped).</note>
  </task>

  <task id="4.2">
    <title>Tela de Consentimento LGPD granular</title>
    <deliverable>Componente + chamada POST /consent</deliverable>
    <status>done</status>
    <note>`ConsentStep.tsx` com fieldset/legend, 3 escopos toggláveis, HTML semântico.</note>
  </task>

  <task id="4.3">
    <title>Tela de Decisão — score, limite, justificativa</title>
    <deliverable>Componente + chamada POST /decision</deliverable>
    <status>done</status>
    <note>`DecisionStep.tsx` — score/limite/explicação + hash parcial; aria-live para status.</note>
  </task>

  <task id="4.4">
    <title>Tela de Simulação Pix — confirma e dispara /pix/simulate</title>
    <deliverable>Componente + feedback de sucesso/erro</deliverable>
    <status>done</status>
    <note>`PixStep.tsx` — gate de aprovação na UI, exibe txid/valor/status + disclaimer PSP.</note>
  </task>

  <task id="4.5">
    <title>Checagem de acessibilidade AA (RNF-10)</title>
    <deliverable>Lighthouse a11y ≥ 90</deliverable>
    <status>pending</status>
    <note>Código aplica práticas: labels atreladas via htmlFor, fieldset/legend, aria-current, aria-live, role=alert, outline de foco. Score Lighthouse efetivo exige execução manual em browser — ação do usuário.</note>
  </task>
</phase>

---

<phase id="5" name="Compliance, Security & Hardening">
  <objective>Resolver pontos de atenção listados em REQUIREMENTS §7.</objective>

  <task id="5.1">
    <title>Autenticação de usuário (magic-link ou OAuth social)</title>
    <deliverable>Fluxo login + sessão segura</deliverable>
    <status>done</status>
    <note>Session-based Bearer tokens (randomBytes 32B → SHA-256 no DB). TTL 7 dias, revogação em cascata no DELETE /consent/me. Magic-link/OAuth ficam para produção (exigem SMTP/OAuth provider).</note>
  </task>

  <task id="5.2">
    <title>Mover credenciais para .env; remover qualquer segredo de config/</title>
    <deliverable>.env.example versionado; validação no boot</deliverable>
    <status>done</status>
    <note>`.env` e `.env.example` criados. Validação formal via zod fica para Phase 5.3.</note>
  </task>

  <task id="5.3">
    <title>Rate limiting e input validation (zod) em src/api/</title>
    <deliverable>Middleware aplicado globalmente</deliverable>
    <status>done</status>
    <note>`@fastify/rate-limit` global (100 req/min, 1000 em test). Schemas zod em `src/api/schemas.ts` aplicados em cada rota via `safeParse` + 400 com `z.treeifyError`.</note>
  </task>

  <task id="5.4">
    <title>Trilha de auditoria imutável (hash encadeado em decision_log)</title>
    <deliverable>Coluna hash + test de integridade</deliverable>
    <status>done</status>
    <note>`prevHash` + `rowHash` em DecisionLog. `src/api/audit.ts` expõe `appendDecisionWithChain` e `verifyChainIntegrity`. 2 testes (cadeia válida + detecção de tampering).</note>
  </task>

  <task id="5.5">
    <title>Implementar direito de revogação LGPD (RN-05)</title>
    <deliverable>Endpoint + efeito em decisões futuras</deliverable>
    <status>done</status>
    <note>DELETE /consent/:userId seta `revokedAt`. `hasActiveConsent` bloqueia /ingest e /decision. Teste cobre o caso.</note>
  </task>
</phase>

---

<phase id="6" name="Deploy & Alpha Release">
  <objective>Publicar Alpha funcional conforme RNF-08.</objective>

  <task id="6.1">
    <title>Pipeline CI (lint + test + build)</title>
    <deliverable>GitHub Actions workflow verde</deliverable>
    <status>done</status>
    <note>`.github/workflows/ci.yml` (setup-node@v4, prisma generate, typecheck, vitest, vite build). Verde efetivo depende de push para repo GitHub — ação do usuário.</note>
  </task>

  <task id="6.2">
    <title>Deploy backend no Render (long-lived Node)</title>
    <deliverable>URL pública + healthcheck</deliverable>
    <status>pending</status>
    <note>`render.yaml` pronto (buildCommand instala deps + migrate deploy, startCommand via tsx, healthCheckPath=/health). Deploy real exige conta Render + push do repo — ação do usuário.</note>
  </task>

  <task id="6.3">
    <title>Deploy frontend no Vercel apontando para backend</title>
    <deliverable>URL pública</deliverable>
    <status>pending</status>
    <note>`vercel.json` pronto (buildCommand, outputDirectory=dist/ui, rewrites para /consent /ingest /decision /pix /health). Substituir `REPLACE_WITH_RENDER_URL` + deploy são ação do usuário.</note>
  </task>

  <task id="6.4">
    <title>Smoke test end-to-end do fluxo completo</title>
    <deliverable>Checklist dos critérios de REQUIREMENTS §8</deliverable>
    <status>done</status>
    <note>`scripts/smoke.ts` (executa consent → ingest → decision → pix via fetch). Roda com `npm run smoke` ou `SMOKE_BASE_URL=https://... npm run smoke` pós-deploy. Além disso, `tests/api/flow.test.ts` cobre o fluxo localmente via `app.inject`.</note>
  </task>

  <task id="6.5">
    <title>Tag v0.1.0-alpha + release notes</title>
    <deliverable>Release no repositório</deliverable>
    <status>pending</status>
    <note>Requer `git init` + push para GitHub antes de `git tag v0.1.0-alpha` + `gh release create`. Projeto atualmente não é um repo git — ação do usuário.</note>
  </task>
</phase>

---

## Ordem de Execução

Phase 1 → 2 → 3 → 4 (3 e 4 podem paralelizar após 3.3) → 5 → 6.

As **3 primeiras tasks de implementação** (1.2, 1.3, 1.4) estabelecem explicitamente o contrato de pastas `src/`, `data/` e `config/` antes de qualquer código de lógica ser escrito — respeitando a Modularidade Estrita e a arquitetura Data-Driven do PROJECT.md.
