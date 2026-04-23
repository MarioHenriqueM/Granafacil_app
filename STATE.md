# STATE — OpenScore GSD

**Status atual:** `Alpha Feature-Complete (pending manual deploy + a11y audit)`
**Data:** 2026-04-22
**Próxima ação:** executar deploy (Render + Vercel) + rodar Lighthouse em browser.

---

## Artefatos

| Documento | Status |
|-----------|--------|
| [PROJECT.md](PROJECT.md) | ✅ Base |
| [REQUIREMENTS.md](REQUIREMENTS.md) | ✅ Concluído |
| [ROADMAP.md](ROADMAP.md) | ✅ Em execução |
| [STATE.md](STATE.md) | ✅ Este arquivo |

---

## Progresso por Fase

| Fase | Nome | Tasks | Concluídas | Status |
|------|------|-------|------------|--------|
| 1 | Planning & Scaffolding | 5 | 5 | ✅ `done` |
| 2 | Core Scoring Engine | 6 | 6 | ✅ `done` |
| 3 | API Layer & Persistence | 6 | 6 | ✅ `done` |
| 4 | UI & Consent Flow | 5 | 4 | 🟡 `in-progress` (4.5 carece de browser) |
| 5 | Compliance, Security & Hardening | 5 | 5 | ✅ `done` |
| 6 | Deploy & Alpha Release | 5 | 2 | 🟡 `in-progress` (6.2, 6.3, 6.5 carecem de ação externa) |

**Total:** 28/32 tasks concluídas (88%). As 4 restantes exigem ações fora do meu alcance (Lighthouse em browser, deploy Render/Vercel, git tag).

---

## Entregas Verificadas

### Phase 4 — UI & Consent Flow
**Stack:** Vite 5 + React 19 + TS. Build produz 201 kB (63 kB gzipped).
- [src/ui/App.tsx](src/ui/App.tsx) — máquina de estados de 4 passos com progress `<ol>` `aria-current`.
- [src/ui/components/ConsentStep.tsx](src/ui/components/ConsentStep.tsx) — fieldset/legend + 3 escopos; `role=alert` em erros.
- [src/ui/components/IngestStep.tsx](src/ui/components/IngestStep.tsx) — `<select>` semântico (aprovado-tipico / borderline / negado-tipico).
- [src/ui/components/DecisionStep.tsx](src/ui/components/DecisionStep.tsx) — `aria-live=polite`, exibe score, decisão, limite, hash parcial, explicação.
- [src/ui/components/PixStep.tsx](src/ui/components/PixStep.tsx) — gate no cliente para aprovação, mostra txid/valor/chave + disclaimer.
- [src/ui/api.ts](src/ui/api.ts) — wrapper `fetch` com `Authorization: Bearer <sessionToken>` automático via `localStorage`.

### Phase 5 — Hardening
- **Session auth** ([src/api/auth.ts](src/api/auth.ts)): `randomBytes(32)` → SHA-256 no DB; TTL 7 dias; `requireAuth` preHandler; `revokedAt` em cascata com revogação de consentimento.
- **Rate limit**: `@fastify/rate-limit` global (100 rpm prod, 1000 em test).
- **Validação zod** ([src/api/schemas.ts](src/api/schemas.ts)): `safeParse` em cada rota; erro estruturado via `z.treeifyError`.
- **Hash chain** ([src/api/audit.ts](src/api/audit.ts)): `appendDecisionWithChain` calcula `rowHash = sha256(prevHash | campos | createdAt)`; `verifyChainIntegrity` detecta tampering. 2 testes cobrem cadeia e detecção.

### Phase 6 — Deploy artifacts
- [.github/workflows/ci.yml](.github/workflows/ci.yml) — typecheck + test + build UI.
- [render.yaml](render.yaml) — web service Node, `migrate deploy`, `/health` como healthcheck.
- [vercel.json](vercel.json) — build/output + rewrites para backend (placeholder `REPLACE_WITH_RENDER_URL`).
- [scripts/smoke.ts](scripts/smoke.ts) — smoke test via `fetch` (`npm run smoke` local, `SMOKE_BASE_URL=...` pós-deploy).

---

## Verificação local (reprodutível)

```bash
npx tsc --noEmit        # clean
npm test                # 46/46 passam (8 suites)
npm run test:cov        # 100% em src/logic/**
npx vite build          # UI bundle OK
```

Cobertura de testes:

| Escopo | Suites | Testes | Cobertura |
|--------|--------|--------|-----------|
| `src/logic/` | 6 | 35 | 100% (statements/branches/functions/lines) |
| `src/api/` | 2 (flow, audit) | 11 | via integração `app.inject` |

---

## Pendências residuais (fora do meu alcance)

| Task | O que falta | Quem executa |
|------|-------------|--------------|
| 4.5 Lighthouse a11y ≥ 90 | Abrir `npm run preview:ui` + rodar Lighthouse ou axe | Usuário em browser |
| 6.2 Deploy Render | Criar serviço Render apontando para `render.yaml`, configurar `DATABASE_URL` | Usuário (conta Render) |
| 6.3 Deploy Vercel | Substituir `REPLACE_WITH_RENDER_URL` em `vercel.json`, importar repo no Vercel | Usuário (conta Vercel) |
| 6.5 Tag release | `git init && git commit && gh release create v0.1.0-alpha` | Usuário (projeto ainda não é repo git) |

---

## Desvios Registrados (acumulados)

1. **ESLint não configurado.** Substituído por TS strict + Prettier.
2. **Penalty `longGapBetweenEntries`** não aplicada — reservada para pós-Alpha.
3. **Componente `diversity` = 0** (placeholder) — pós-Alpha.
4. **SQLite para Alpha.** PROJECT.md pede PostgreSQL; troca é `provider = "postgresql"` + nova migration.
5. **Prisma 7 → 6 (downgrade).** Prisma 7 exige `prisma.config.ts` + adapter; Prisma 6 tem padrão clássico.
6. **Fastify 5 + Pino.** Não especificado em PROJECT.md (era "React"/Node genérico); Fastify escolhido por TS nativo + logger estruturado built-in.
7. **Fixture `aprovado-tipico.json`** expandido de 5 → 35 transações.
8. **Auth: session-based (Bearer) no lugar de magic-link/OAuth.** Decisão pragmática para Alpha.
9. **Produção rodará via `tsx` em vez de compilar para `dist/`.** Performance aceitável para Alpha; compilar para `dist/` é hardening pós-Alpha.
10. **Hint React 19: `FormEvent` deprecated.** TS não bloqueia (severity: hint). Migração para `React.FormEventHandler` é nice-to-have.

---

## Decisões-Chave (acumuladas)

1. Score rule-based (não-ML).
2. Pix e Open Finance simulados no Alpha.
3. Segredos fora de `config/`.
4. Backend no Render (long-lived), frontend no Vercel (static).
5. Schema OFB fase 2 nos mocks.
6. TS `module: ESNext` + `moduleResolution: Bundler`.
7. Testes em `tests/` top-level espelhando estrutura de `src/`.
8. `src/logic/` permanece puro — toda IO em `src/api/`.
9. `Snapshot` separado de `DecisionLog` permite re-scoring sem perder input.
10. Pool de teste `forks` + `singleFork: true` serializa acesso ao SQLite.
11. Session token em `localStorage` no UI (Alpha). Migração para cookie httpOnly é hardening pós-Alpha.
12. Hash chain global (sequencial por ordem de criação) em vez de por-usuário — auditoria mais simples, linha única do tempo.

---

## Riscos Abertos

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Token em `localStorage` é vulnerável a XSS | Média | Migrar para cookie httpOnly pós-Alpha; UI atual não renderiza HTML de terceiros. |
| `tsx` em produção consome mais memória que JS compilado | Baixa | Render free tier tolera; compilar para `dist/` em v0.2. |
| Migração SQLite → Postgres pode expor queries com diferenças sutis | Baixa | Queries Prisma são portáveis; testar em staging. |
| Rate limit global 100 rpm pode ser agressivo para apps | Baixa | Tunar por rota quando houver tráfego real. |
| Lighthouse a11y pode exigir ajustes | Baixa | HTML já segue padrões AA; provável pass direto. |

---

## Como executar localmente (referência rápida)

```bash
# Instalação
npm install
npx prisma generate
npx prisma migrate dev

# Dev — 2 terminais
npm run dev          # backend Fastify @ :3000
npm run dev:ui       # frontend Vite @ :5173 (proxy -> :3000)

# Build + preview
npm run build:ui
npm run preview:ui

# Testes
npm test
npm run test:cov
npm run smoke        # happy path contra localhost:3000
```
