# STATE — GranaFacil

**Status atual:** `Alpha Feature-Complete + PostgreSQL migrado + Antifraude (pending manual deploy + a11y audit)`
**Data:** 2026-04-24
**Próxima ação:** executar deploy (Render + Vercel) + rodar Lighthouse em browser. Trocar `FRAUD_SALT` em produção.

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
| 7 | Database Migration to PostgreSQL | 7 | 7 | ✅ `done` |
| 8 | Antifraud Layer | 9 | 9 | ✅ `done` |

**Total:** 44/48 tasks concluídas (91,7%). As 4 restantes exigem ações fora do meu alcance (Lighthouse em browser, deploy Render/Vercel, git tag).

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
- [.github/workflows/ci.yml](.github/workflows/ci.yml) — typecheck + test + build UI (agora com service container `postgres:16-alpine`).
- [render.yaml](render.yaml) — web service Node, `migrate deploy`, `/health` como healthcheck.
- [vercel.json](vercel.json) — build/output + rewrites para backend (placeholder `REPLACE_WITH_RENDER_URL`).
- [scripts/smoke.ts](scripts/smoke.ts) — smoke test via `fetch` (`npm run smoke` local, `SMOKE_BASE_URL=...` pós-deploy).

### Phase 8 — Antifraud Layer (2026-04-24)
- [config/antifraud.json](config/antifraud.json) — parâmetros de circularidade (tolerancePct=0.01, maxRatio=0.5) e device fingerprinting (lookback 7d, maxUsersPerDevice=3, maxUsersPerIp=20).
- [src/logic/circularity.ts](src/logic/circularity.ts) + [tests/logic/circularity.test.ts](tests/logic/circularity.test.ts) — função pura `filterCircular` neutraliza pares CREDIT+DEBIT do mesmo dia UTC com diferença dentro da tolerância. 8 testes unitários.
- [src/logic/score.ts](src/logic/score.ts) / [src/logic/decide.ts](src/logic/decide.ts) / [src/logic/explain.ts](src/logic/explain.ts) — filtro roda antes de freq/reg/bal; `ScoreResult.raw.circ` exposto; `denialReason: CIRCULARITY_SUSPECT` se ratio > threshold; explicação cita pares neutralizados.
- [data/profiles/fraude-circular.json](data/profiles/fraude-circular.json) — fixture com 11 pares circulares + 2 créditos genuínos → CIRCULARITY_SUSPECT validado em teste logic e API.
- [prisma/schema.prisma](prisma/schema.prisma) — novo model `DeviceFingerprint`. Migration `20260424182414_add_device_fingerprint`.
- [src/api/fingerprint.ts](src/api/fingerprint.ts) — `hashIp(ip)` com `FRAUD_SALT`; `checkAndRegisterFingerprint` bloqueia por deviceHash ou ipHash em janela `lookbackDays`.
- [src/api/consent.ts](src/api/consent.ts) — gate antifraude após upsert de user, antes de criar consent. HTTP 429 com `error: device_limit_exceeded` ou `ip_limit_exceeded`.
- [src/api/schemas.ts](src/api/schemas.ts) — `grantConsentSchema` aceita `deviceHash?: string` (hex 8-128).
- [src/ui/api.ts](src/ui/api.ts) — `computeDeviceHash()` via canvas + navigator fingerprint + SHA-256, cacheado em `localStorage` e anexado em toda chamada de `grantConsent`.
- [src/ui/components/IngestStep.tsx](src/ui/components/IngestStep.tsx) — opção "Fraude circular (PIX entra+sai mesmo dia)" adicionada ao select de perfis de teste.
- [tests/api/fraud.test.ts](tests/api/fraud.test.ts) — 5 testes: device limit (3 OK + 4º bloqueado), não bloqueia devices distintos, upsert do mesmo user não conta múltiplas vezes, IP limit (20 OK + 21º bloqueado), fluxo e2e fraude-circular.
- Verificação: 60/60 testes verdes; `npm run smoke` segue aprovando `aprovado-tipico` com score=672.

### Phase 7 — PostgreSQL Migration (2026-04-24)
- [docker-compose.yml](docker-compose.yml) — `postgres:16-alpine` em `localhost:5433`, healthcheck, volume nomeado.
- [scripts/init-test-db.sql](scripts/init-test-db.sql) — cria `granafacil_test` no boot do container.
- [prisma/schema.prisma](prisma/schema.prisma) — `provider = "postgresql"`.
- [prisma/migrations/20260424133124_init](prisma/migrations/20260424133124_init/migration.sql) — migration regenerada para Postgres; migrations SQLite antigas removidas.
- [tests/env.setup.ts](tests/env.setup.ts) + [tests/global.setup.ts](tests/global.setup.ts) — `DATABASE_URL` em Postgres, reset via `prisma db push --force-reset` por global setup.
- [.github/workflows/ci.yml](.github/workflows/ci.yml) — service container postgres + envs.
- [.env](.env) + [.env.example](.env.example) — atualizados com URL Postgres.
- Verificação: 46/46 testes verdes em Postgres; `npm run smoke` com `aprovado-tipico` → `score=672`, aprovado.

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
| `src/api/` | 3 (flow, audit, fraud) | 16 | via integração `app.inject` |
| `src/logic/circularity` | 1 | 8 | 100% |

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
4. ~~**SQLite para Alpha.**~~ **RESOLVIDO em Phase 7 (2026-04-24):** provider trocado para PostgreSQL, migration regenerada, harness de testes + CI adaptados. Stack agora consistente com PROJECT.md.
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
13. **Antifraude circularidade** roda dentro de `computeScore` como pré-processamento (não penalty aditiva). Motivo: impedir inflação é função de "limpeza de sinal", não de punição proporcional — remove o ruído antes de medir.
14. **IP armazenado sempre como SHA-256(IP+FRAUD_SALT)**, nunca em claro. Base legal LGPD: art. 7º X (prevenção à fraude/proteção ao crédito), não `consent`.
15. **Upsert do User antes do gate antifraude**: emails repetidos retornam o mesmo userId e não inflam contagem de usuários distintos no device/IP — cobre reconexão legítima. Contagem é `distinct userId`, não `distinct tentativa`.

---

## Riscos Abertos

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Token em `localStorage` é vulnerável a XSS | Média | Migrar para cookie httpOnly pós-Alpha; UI atual não renderiza HTML de terceiros. |
| `tsx` em produção consome mais memória que JS compilado | Baixa | Render free tier tolera; compilar para `dist/` em v0.2. |
| Migração SQLite → Postgres pode expor queries com diferenças sutis | Baixa | Queries Prisma são portáveis; testar em staging. |
| Rate limit global 100 rpm pode ser agressivo para apps | Baixa | Tunar por rota quando houver tráfego real. |
| Lighthouse a11y pode exigir ajustes | Baixa | HTML já segue padrões AA; provável pass direto. |
| `FRAUD_SALT` padrão `dev-fraud-salt-change-me` se env ausente | Média em prod | Definir `FRAUD_SALT` longo e aleatório antes do deploy; rotacionar exige recomputar ipHash histórico (nova migration). |
| Canvas fingerprint é burlável (anti-detect browsers) | Média | Cobre fraude oportunista; para ataques sofisticados exige provedor comercial de FP. Aceitável para Alpha. |
| Regra `samedayUTC` pode deixar escapar crédito 23:55 + débito 00:05 | Baixa | Janela rolante de 24h é refinamento pós-Alpha (ajuste em `filterCircular`). |
| `User` upsertado antes do gate fica como "zumbi" se gate bloquear | Baixa | Email fica "reservado" sem consent; não há superfície de ataque. Limpeza via job pós-Alpha. |
| IP hash não expira automaticamente | Média (LGPD) | `lookbackDays` filtra por janela mas linhas antigas persistem. Job de retenção (180 dias?) fica para pós-Alpha. |

---

## Como executar localmente (referência rápida)

```bash
# Infra
docker compose up -d           # Postgres 16 em localhost:5433

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
