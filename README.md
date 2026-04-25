<div align="center">

# GranaFacil

**Motor de Crédito para a Economia Gig**

_Aprovação de crédito instantânea via Pix para trabalhadores informais — substituindo comprovante de renda por análise comportamental de fluxo de caixa, com decisão explicável._

[![Status](https://img.shields.io/badge/status-alpha-orange)](STATE.md)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tested with Vitest](https://img.shields.io/badge/tested%20with-vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

</div>

---

## Sumário

- [Por que GranaFacil?](#por-que-granafacil)
- [Principais funcionalidades](#principais-funcionalidades)
- [Arquitetura](#arquitetura)
- [Stack tecnológico](#stack-tecnológico)
- [Começando](#começando)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Scripts disponíveis](#scripts-disponíveis)
- [Antifraude](#antifraude)
- [Compliance & LGPD](#compliance--lgpd)
- [Deploy](#deploy)
- [Roadmap](#roadmap)
- [Documentação](#documentação)
- [Licença](#licença)

---

## Por que GranaFacil?

Mais de 40 milhões de brasileiros vivem da economia gig (Uber, iFood, autônomos) e são sistematicamente excluídos do crédito formal por não conseguirem apresentar comprovantes de renda tradicionais.

O **GranaFacil** resolve isso com um motor de score **rule-based, parametrizado e explicável**, que analisa **frequência**, **regularidade** e **saldo dinâmico** a partir de dados de Open Finance — entregando decisão em **menos de 2 segundos** e liquidação simulada via Pix.

> **Lógica sobre estética.** No Alpha, integridade da simulação e precisão do score superam refinamento visual. Modularidade estrita: o motor evolui independente da UI e das fontes de dados.

---

## Principais funcionalidades

| | |
|---|---|
| **Score comportamental** | Frequência, regularidade e saldo dinâmico em janela móvel de 90 dias. Pesos configuráveis em `config/risk-presets.json` — sem hardcode no core. |
| **Decisão explicável** | Cada aprovação/negação acompanha justificativa textual legível. Zero ML black-box. |
| **Open Finance (mock)** | Perfis JSON seguindo schema oficial do OFB fase 2, prontos para troca pela integração real. |
| **Pix simulado** | Endpoint stub `/pix/simulate` com payload compatível para liquidação futura. |
| **Auditoria criptográfica** | Hash chain SHA-256 sobre cada decisão; `verifyChainIntegrity` detecta tampering. |
| **Antifraude embutido** | Filtro de circularidade + device/IP fingerprinting com hash salgado. |
| **Consentimento LGPD** | Granular, revogável, com log imutável. Revogação invalida decisões futuras, preserva histórico. |
| **Auth de sessão** | Tokens com `randomBytes(32)` armazenados como SHA-256 no DB; TTL 7 dias. |
| **Rate limit + Zod** | `@fastify/rate-limit` global e validação `safeParse` em todas as rotas. |

---

## Arquitetura

```
            ┌──────────────────────┐
            │   React 19 (Vite)    │   ← Vercel
            │  Consent → Ingest    │
            │  → Decision → Pix    │
            └──────────┬───────────┘
                       │ HTTPS + Bearer token
            ┌──────────▼───────────┐
            │   Fastify 5 (API)    │   ← Render
            │   Zod · RateLimit    │
            └──────────┬───────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
 ┌───────────┐  ┌─────────────┐  ┌──────────────┐
 │  logic/   │  │  antifraud  │  │   audit/     │
 │  (puro)   │  │ circularity │  │  hash chain  │
 │  score    │  │ fingerprint │  │  SHA-256     │
 └───────────┘  └─────────────┘  └──────┬───────┘
                                        ▼
                                 ┌─────────────┐
                                 │ PostgreSQL  │
                                 │   Prisma    │
                                 └─────────────┘
```

**Princípio Data-Driven:** o comportamento do motor é parametrizado por arquivos externos (`config/`, `data/`), permitindo ajustar risco sem alterar o core.

**Princípio Modularidade Estrita:** `src/logic/` não importa de `src/ui/` nem de `src/api/`. O score evolui isolado.

---

## Stack tecnológico

| Camada | Tecnologia | Por quê |
|---|---|---|
| Engine | **Node.js + TypeScript** (strict) | Velocidade de desenvolvimento + type-safety em domínio financeiro |
| API | **Fastify 5** | Performance, plugins maduros, schema-first com Zod |
| Frontend | **React 19 + Vite 5** | Build rápido, dashboards funcionais; bundle 201 kB (63 kB gzip) |
| ORM | **Prisma 6** | Migrations reprodutíveis e type-safety end-to-end |
| Banco | **PostgreSQL 16** | Consistência relacional para histórico financeiro auditável |
| Validação | **Zod 4** | `safeParse` em cada rota, erro estruturado |
| Testes | **Vitest** | Integração nativa com TS; cobertura ≥ 80% em `src/logic/` |
| Hospedagem | **Render** (API) + **Vercel** (UI) | Long-lived Node no Render, edge no Vercel |

---

## Começando

### Pré-requisitos

- Node.js ≥ 20
- PostgreSQL 16 (ou Docker — ver `docker-compose.yml`)
- npm

### Instalação

```bash
git clone <repo-url>
cd Granafacil_app
npm install
```

### Configuração

Crie um `.env` na raiz com:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/granafacil"
FRAUD_SALT="troque-em-producao"
PORT=3000
```

> **Atenção:** `config/` guarda apenas parâmetros de risco. **Credenciais sempre em `.env`.**

### Banco de dados

```bash
npm run db:push        # aplica schema sem migration (dev)
# ou
npm run db:migrate     # cria migration versionada
npm run db:generate    # gera o Prisma Client
```

### Rodando localmente

```bash
# API (Fastify) — http://localhost:3000
npm run dev

# UI (Vite) — http://localhost:5173
npm run dev:ui
```

### Smoke test

```bash
npm run smoke                              # contra localhost
SMOKE_BASE_URL=https://... npm run smoke   # contra deploy
```

---

## Estrutura do projeto

```
Granafacil_app/
├── config/                 # parâmetros de risco (versionados, sem segredos)
│   ├── risk-presets.json
│   ├── limits.json
│   └── antifraud.json
├── data/                   # mocks Open Finance + pesos
│   ├── profiles/*.json
│   └── weights.json
├── prisma/
│   └── schema.prisma
├── src/
│   ├── logic/              # motor de score (puro, sem IO)
│   ├── api/                # Fastify handlers, auth, audit, schemas
│   └── ui/                 # React components
├── tests/                  # Vitest
├── scripts/
│   └── smoke.ts
├── PROJECT.md              # visão e filosofia
├── REQUIREMENTS.md         # requisitos funcionais e não-funcionais
├── ROADMAP.md              # fases de execução
└── STATE.md                # status atual
```

---

## Scripts disponíveis

| Comando | Ação |
|---|---|
| `npm run dev` | Sobe a API com `tsx watch` |
| `npm run dev:ui` | Sobe o frontend Vite |
| `npm run build:ui` | Build de produção da UI |
| `npm run start` | Roda a API com `node --import tsx` |
| `npm run test` | Roda Vitest uma vez |
| `npm run test:watch` | Vitest em modo watch |
| `npm run test:cov` | Cobertura via `@vitest/coverage-v8` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier `--write .` |
| `npm run db:push` / `db:migrate` / `db:generate` | Operações Prisma |
| `npm run smoke` | Smoke test ponta-a-ponta |

---

## Antifraude

Dois sinais reais de campo motivaram a camada antifraude do Alpha:

**1. Circularidade** (`RN-06`)
Pares CREDIT/DEBIT do mesmo dia com diferença ≤ `tolerancePct` (padrão 1%) são removidos antes do cálculo. Se `pairsRemoved / totalCredits > 50%`, decisão é negada com motivo `CIRCULARITY_SUSPECT`.

**2. Device & IP fingerprinting** (`RN-07`)
`/consent` registra `{deviceHash?, ipHash, userAgent}` — IP sempre como SHA-256 com salt, nunca em claro. Bloqueia HTTP 429 quando:
- mesmo `deviceHash` → mais de 3 usuários distintos em 7 dias
- mesmo `ipHash` → mais de 20 usuários distintos em 7 dias (tolerante a CGNAT/coworking)

Parâmetros em `config/antifraud.json`. Base legal LGPD: prevenção à fraude / proteção ao crédito (art. 7º, IX e X).

---

## Compliance & LGPD

- **Consentimento granular e revogável** (art. 7º, 8º, 9º) com log imutável.
- **Direito do titular** (art. 18) coberto por trilha de auditoria com hash chain.
- **Revogação preserva histórico** mas invalida decisões futuras.
- **Score rule-based** — sem ML black-box, mitigando risco regulatório BACEN/LGPD.
- **Log estruturado JSON** de cada decisão: inputs, pesos aplicados, score final.

---

## Deploy

| Componente | Plataforma | Configuração |
|---|---|---|
| API | Render (Node long-lived) | [`render.yaml`](render.yaml) — `migrate deploy` + `/health` healthcheck |
| UI | Vercel | [`vercel.json`](vercel.json) — rewrites para backend |
| CI | GitHub Actions | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — typecheck + test + build com Postgres 16 service container |

> **Não use Vercel para o motor.** Cold start serverless é incompatível com workers do score. UI no Vercel, API no Render.

---

## Roadmap

| Fase | Nome | Status |
|---|---|---|
| 1 | Planning & Scaffolding | concluído |
| 2 | Core Scoring Engine | concluído |
| 3 | API Layer & Persistence | concluído |
| 4 | UI & Consent Flow | em andamento (Lighthouse pendente) |
| 5 | Compliance, Security & Hardening | concluído |
| 6 | Deploy & Alpha Release | em andamento |
| 7 | Database Migration to PostgreSQL | concluído |
| 8 | Antifraud Layer | concluído |

**44/48 tasks concluídas (91,7%).** Detalhes em [ROADMAP.md](ROADMAP.md) e [STATE.md](STATE.md).

---

## Documentação

- [PROJECT.md](PROJECT.md) — visão, filosofia e arquitetura
- [REQUIREMENTS.md](REQUIREMENTS.md) — requisitos funcionais, não-funcionais e regras de negócio
- [ROADMAP.md](ROADMAP.md) — fases de entrega
- [STATE.md](STATE.md) — status atual
- [DOCUMENTATION.md](DOCUMENTATION.md) — referência detalhada

---

## Licença

Projeto privado em estágio Alpha. Defina a licença antes do release público.

---

<div align="center">

**GranaFacil** · Crédito justo para quem o sistema esqueceu.

</div>
