# GranaFacil — Documentação Técnica Completa

> **Versão:** 0.1.0-alpha  
> **Data:** 2026-04-24  
> **Status:** Feature-complete + PostgreSQL + Antifraude

---

## 1. Visão Geral

### Problema

Trabalhadores da economia gig (Uber, iFood, autônomos) enfrentam **exclusão financeira** ao tentar acessar crédito:

- **Comprovantes de renda inadequados** — contracheques não existem para autônomos; extrato bancário desatualizado não reflete ganhos reais no mês.
- **Processos lentos** — aprovação manual leva dias ou semanas; credores informais cobram juros abusivos (5–10% a.m.).
- **Falta de transparência** — decisões de crédito "caixa preta" recusam sem explicação, impossibilitando correção de dados.
- **Risco concentrado** — credores tradicionais desconhecem fluxo de caixa de gig workers, exigindo colateral impossível.

### Solução

**GranaFacil** é uma plataforma de Open Finance que substitui comprovantes de renda por **análise comportamental de fluxo de caixa**:

1. **Coleta via Open Finance** — Usuário autoriza (LGPD) compartilhamento de 90 dias de transações bancárias.
2. **Análise de padrões** — Motor calcula frequência, regularidade e saldo dinâmico das entradas.
3. **Decisão em tempo real** — Score comportamental (0–1000) e limite de crédito em ≤ 2 segundos.
4. **Transparência explicável** — Cada decisão inclui justificativa textual simples (ex.: "Aprovado: frequência estável ±5%, saldo positivo 87% dos dias").
5. **Liquidação simulada via Pix** — Transferência instantânea de crédito aprovado para conta do usuário.

**Resultado:** Crédito acessível, rápido, justo e compreensível para economia gig.

---

## 2. Arquitetura

### Diagrama de Fluxo (Macro)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USUÁRIO (Gig Worker)                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                    Autoriza consentimento
                    (LGPD - 90 dias)
                           │
                           ▼
        ┌──────────────────────────────────────────────────┐
        │    UI (React 19 + Vite)                          │
        │  • Tela 1: Consentimento                         │
        │  • Tela 2: Ingerir dados (selecionar perfil)     │
        │  • Tela 3: Decisão + Score                       │
        │  • Tela 4: Simulação Pix                         │
        └────────────────┬────────────────────────────────┘
                         │ HTTP + Bearer token
                         │
        ┌────────────────▼────────────────────────────────┐
        │    Backend (Fastify 5 + Node.js)                │
        │    ┌───────────────────────────────────────┐    │
        │    │  src/api/                             │    │
        │    │  • /consent (POST, DELETE)            │    │
        │    │  • /ingest (POST)                     │    │
        │    │  • /decision (POST)                   │    │
        │    │  • /pix/simulate (POST)               │    │
        │    │  • /audit (GET)                       │    │
        │    └───────────┬──────────────────────────┘    │
        │               │                               │
        │    ┌──────────▼──────────────────────────┐    │
        │    │  src/logic/ (Motor Puro)            │    │
        │    │  • frequency.ts                     │    │
        │    │  • regularity.ts                    │    │
        │    │  • balance.ts                       │    │
        │    │  • circularity.ts (antifraude)      │    │
        │    │  • score.ts (composição)            │    │
        │    │  • decide.ts (regras de negócio)    │    │
        │    │  • explain.ts (justificativas)      │    │
        │    └───────────┬──────────────────────────┘    │
        │               │                               │
        │    ┌──────────▼──────────────────────────┐    │
        │    │  Configurações + Dados              │    │
        │    │  • config/risk-presets.json         │    │
        │    │  • config/limits.json               │    │
        │    │  • config/antifraud.json            │    │
        │    │  • data/weights.json                │    │
        │    │  • data/profiles/*.json             │    │
        │    └──────────────────────────────────────┘    │
        │                                                 │
        │    PostgreSQL (Persistence)                    │
        │    • users (ID, email)                         │
        │    • consents (histórico LGPD)                 │
        │    • snapshots (dados ingeridos)               │
        │    • decision_log (decisões auditáveis)        │
        │    • device_fingerprint (antifraude)           │
        └─────────────────────────────────────────────────┘
```

### Principais Componentes

#### **src/logic/** — Motor Puro (Sem IO)
Funções matemáticas que calculam score. Lêem `config/` e `data/`, mas **nunca acessam banco ou rede**.

| Arquivo | Responsabilidade |
|---------|------------------|
| `frequency.ts` | Calcula entradas/mês e desvio padrão |
| `regularity.ts` | Mede consistência temporal (quanto mais regular, maior score) |
| `balance.ts` | Analisa saldo dinâmico e percentual de dias negativos |
| `circularity.ts` | Filtra transações circulares (CREDIT+DEBIT mesmo dia) — antifraude |
| `score.ts` | Compõe score final via pesos parametrizados |
| `decide.ts` | Aplica regras de negócio (aprovado/negado + limite de crédito) |
| `explain.ts` | Gera justificativa textual legível |

#### **src/api/** — API HTTP (Fastify 5)
Endpoints que orquestram IO (BD, autenticação, logging).

| Rota | Método | Função |
|------|--------|--------|
| `/consent` | POST | Cria registro de consentimento; valida fingerprint antifraude |
| `/consent/:userId` | GET | Consulta consentimento do usuário |
| `/consent/:userId` | DELETE | Revoga consentimento (cascata invalida decisões futuras) |
| `/ingest` | POST | Carrega mock de perfil financeiro (ex.: `aprovado-tipico`) |
| `/decision` | POST | Orquestra motor + persiste resultado |
| `/pix/simulate` | POST | Simula liquidação de crédito aprovado |
| `/audit` | GET | Retorna histórico de decisões com cadeia de hash (detecção de tampering) |

#### **src/ui/** — Interface React
Componentes + máquina de estados (4 passos).

| Componente | Função |
|-----------|--------|
| `App.tsx` | Container principal; orquestra 4 etapas |
| `ConsentStep.tsx` | Fluxo LGPD com 3 escopos granulares |
| `IngestStep.tsx` | Seleciona perfil mock para teste |
| `DecisionStep.tsx` | Exibe score, decisão, limite, justificativa |
| `PixStep.tsx` | Gate de aprovação + simulação Pix |
| `api.ts` | Wrapper `fetch` com autenticação Bearer automática |

#### **Database (PostgreSQL 16)**
Tabelas rastreáveis e auditáveis.

| Tabela | Campos | Propósito |
|--------|--------|----------|
| `User` | `id, email, createdAt` | Identidade do usuário |
| `Consent` | `userId, scopes, grantedAt, revokedAt` | Trilha LGPD — consentimento granular e revogação |
| `Snapshot` | `consentId, profileData (JSON), hash` | Snapshot dos dados ingeridos (imutável) |
| `DecisionLog` | `snapshotId, score, approved, limit, denialReason, hash, prevHash` | Decisões com cadeia SHA-256 |
| `DeviceFingerprint` | `userId, deviceHash, ipHash, createdAt` | Registro de dispositivos (antifraude) |

#### **Configuração (Arquivos Estáticos)**
Parametrizam comportamento sem código.

| Arquivo | Conteúdo |
|---------|----------|
| `config/risk-presets.json` | Presets de risco (conservative/balanced/aggressive) |
| `config/limits.json` | Limites de crédito (min/max) |
| `config/antifraud.json` | Parâmetros de circularidade + device fingerprinting |
| `data/weights.json` | Pesos dos componentes do score (frequência 35%, regularidade 30%, saldo 25%, diversidade 10%) |
| `data/profiles/*.json` | Mocks de 90 dias de transações |

---

## 3. Modelo de Score

### Dados Utilizados

O motor lê **90 dias de transações bancárias** estruturadas conforme **schema OFB (Open Finance Brasil) fase 2**:

```json
{
  "transactions": [
    {
      "date": "2026-04-01",
      "amount": 150.50,
      "type": "CREDIT",
      "description": "Uber earnings"
    },
    {
      "date": "2026-04-01",
      "amount": 45.00,
      "type": "DEBIT",
      "description": "Gas"
    }
  ],
  "windowDays": 90
}
```

**Tipos de dados:**
- **CREDIT** — Entrada (ganho do gig worker)
- **DEBIT** — Saída (despesa, consumo)
- **date** — Data UTC (YYYY-MM-DD)
- **amount** — Valor em BRL (sempre positivo; tipo diferencia sinal)
- **description** — Categorização opcional

**Janela de análise:** 90 dias (configurável em `Profile.windowDays`)

### Cálculo do Score — Passo a Passo

```
┌───────────────────────────────────────────────────────────────┐
│ 1. ENTRADA: Transações brutas (90 dias)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────▼────────────────┐
        │ 2. FILTRO: Circularidade    │
        │ Remove CREDIT+DEBIT         │
        │ mesmo dia (fraude)          │
        └────────────┬────────────────┘
                     │
        ┌────────────▼────────────────────────────────────┐
        │ 3. COMPONENTES (0–1, normalizado)               │
        │                                                 │
        │ a) FREQUÊNCIA                                   │
        │    entradas/mês ÷ 20 = [0–1]                   │
        │    Ex: 10 entradas/mês → 0.5                   │
        │                                                 │
        │ b) REGULARIDADE                                 │
        │    quanto mais consistente, mais alto           │
        │    Ex: variação ±5% → 1.0                      │
        │                                                 │
        │ c) SALDO DINÂMICO                              │
        │    saldo médio mensal ÷ R$ 2.000 = [0–1]       │
        │    Ex: R$ 1.000/mês → 0.5                      │
        │                                                 │
        │ d) DIVERSIDADE                                 │
        │    (placeholder) = 0.0 (futuro)                │
        └────────────┬───────────────────────────────────┘
                     │
        ┌────────────▼──────────────────────┐
        │ 4. COMPOSIÇÃO (Weighted Sum)       │
        │ weighted = 0.35×freq              │
        │          + 0.30×reg               │
        │          + 0.25×bal               │
        │          + 0.10×div               │
        │ Resultado: [0–1]                  │
        └────────────┬──────────────────────┘
                     │
        ┌────────────▼──────────────────────────────────┐
        │ 5. PENALIDADES                                │
        │ - Por cada dia com saldo negativo:             │
        │   penalty = (negDays × -2) ÷ 1000             │
        │ Ex: 15 dias negativos → -0.03                 │
        └────────────┬──────────────────────────────────┘
                     │
        ┌────────────▼──────────────────────────────────┐
        │ 6. SCORE FINAL (0–1000)                       │
        │ score_final = clamp01(weighted - penalty) × 1000│
        └────────────┬──────────────────────────────────┘
                     │
        └────────────▼──────────────────────────────────┘
                    SCORE FINAL [0–1000]

Exemplo:
freq=0.5, reg=0.8, bal=0.6, div=0, penalty=0.03
→ weighted = 0.35×0.5 + 0.30×0.8 + 0.25×0.6 + 0.10×0 = 0.545
→ raw = 0.545 - 0.03 = 0.515
→ score = 0.515 × 1000 = 515 ✓
```

### Regras e Lógica de Decisão

Após calcular o score, o motor aplica **regras de negócio** (hard constraints):

```
┌─────────────────────────────────────────────────────────┐
│ DECISION TREE                                           │
└─────────────────────────────────────────────────────────┘

IF transações < 5 THEN
  ❌ NEGA: INSUFFICIENT_DATA
  (precisa de histórico mínimo)

ELSE IF circularityRatio > 50% THEN
  ❌ NEGA: CIRCULARITY_SUSPECT
  (muitos pares CREDIT+DEBIT suspeitos)

ELSE IF entradas/mês < threshold THEN
  ❌ NEGA: LOW_FREQUENCY
  (ex: preset balanced exige 8 entradas/mês)

ELSE IF dias_negativos_ratio > threshold THEN
  ❌ NEGA: NEGATIVE_BALANCE
  (ex: preset balanced tolera máx 30%)

ELSE IF saldo_médio < threshold THEN
  ❌ NEGA: LOW_BALANCE
  (ex: preset balanced exige R$ 200/mês)

ELSE IF score < threshold THEN
  ❌ NEGA: LOW_SCORE
  (ex: preset balanced exige 600)

ELSE
  ✅ APROVA
  creditLimit = função(saldo_médio, frequência, desvio)
  (arredondado para múltiplo de R$ 50)
```

**Presets de Risco (em `config/risk-presets.json`):**

| Preset | Freq. Min | Dias Neg. Max | Saldo Min | Score Min |
|--------|-----------|---------------|-----------|-----------|
| **Conservative** | 12/mês | 15% | R$ 500 | 700 |
| **Balanced** | 8/mês | 30% | R$ 200 | 600 |
| **Aggressive** | 5/mês | 45% | R$ 0 | 500 |

**Limite de Crédito:**

```
creditLimit = clamp(
  saldo_médio × 0.5  +  frequência × 100  +  (1 - desvio_padrão) × 50,
  minLimit = 100,
  maxLimit = 5000
) rounded to nearest 50
```

### Exemplo Completo: Usuário "Aprovado-Típico"

**Dados de entrada (90 dias):**
```
35 transações CREDIT (ganhos)
35 transações DEBIT (despesas)
Saldo médio: R$ 672
Entradas: 11.7/mês
Variação: ±4%
Dias negativos: 12%
```

**Cálculo:**
```
freq = 11.7 / 20 = 0.585
reg = 0.95 (alta consistência ±4%)
bal = 672 / 2000 = 0.336
div = 0 (placeholder)

weighted = 0.35×0.585 + 0.30×0.95 + 0.25×0.336 + 0 = 0.628
penalty = (12% × 90 × -2) / 1000 = -0.0216
raw = 0.628 - 0.022 = 0.606
score = 0.606 × 1000 = 606 ✓

✅ APROVADO (score 606 > threshold 600)
💰 Limite: R$ 500
```

---

## 4. Decisões Técnicas

### Tecnologias Escolhidas

| Camada | Tecnologia | Motivação | Trade-offs |
|--------|-----------|-----------|-----------|
| **Motor** | Node.js 20 + TypeScript (strict) | Desenvolvimento ágil + ecosistema JS + type-safety | Menor raw performance em cálculos pesados (negligenciável para Alpha) |
| **Backend** | Fastify 5 | TS nativo, logger Pino built-in, performance | Menos middleware que Express; curva aprendizado |
| **Database** | PostgreSQL 16 + Prisma 6 | Type-safety ORM + migrations reprodutíveis + ACID | Overkill para Alpha, mas essential para escalabilidade |
| **Frontend** | React 19 + Vite 5 | Componentes reutilizáveis + build rápido | JSX não-nativo; mais dependências |
| **Autenticação** | Session Bearer Tokens (SHA-256) | Simples, sem SMTP/OAuth | Tokens em localStorage vulneráveis a XSS (mitigo pós-Alpha) |
| **Logging** | Pino JSON | Estruturado, parseable por observabilidade | Overhead de serialização minimal |
| **Testes** | Vitest + @vitest/ui | Vite-native, ESM out-of-box | Menos maduro que Jest (aceitável para Alpha) |
| **Deploy** | Vercel (UI) + Render (backend) | Serverless + long-lived, CI/CD integrado | Cold starts no Vercel; custo Render. Opção: Netlify + Railway |

### Trade-offs Aceitos (Propositais)

#### 1. **Score Rule-Based (Não-ML)**
- ✅ **Vantagem:** Explicabilidade = conformidade LGPD (art. 20 — direito à explicação).
- ❌ **Desvantagem:** Score menos sofisticado que modelos treinados.
- **Justificativa:** Alpha prioriza transparência; ML é roadmap pós-Phase 8.

#### 2. **Pix e Open Finance Simulados**
- ✅ **Vantagem:** Prototypar sem integração BACEN (certificado ICP, DCR).
- ❌ **Desvantagem:** Não há liquidação de verdade; parceria PSP real é obrigatória para produção.
- **Justificativa:** Validar modelo antes de overhead regulatório.
- **Trilha:** `src/api/pix.ts` já estrutura payload compatível com PSP real.

#### 3. **Fastify (vs. Express)**
- ✅ **Vantagem:** TS nativo, async-first, logger integrado.
- ❌ **Desvantagem:** Menos middleware disponível (Express domina).
- **Justificativa:** Stack TS-first; middlewares críticos já cobertos (`@fastify/rate-limit`, zod).

#### 4. **PostgreSQL Local (vs. Neon/Supabase)**
- ✅ **Vantagem:** Dev local reprodutível (`docker-compose.yml`).
- ❌ **Desvantagem:** Render free tier não oferece Postgres permanente; produção exige migração para Neon/Supabase.
- **Justificativa:** Separar dev de prod; deploy exigirá config `DATABASE_URL` manual.

#### 5. **Session Bearer (vs. Cookie httpOnly)**
- ✅ **Vantagem:** Simples de testar, frontend controlado.
- ❌ **Desvantagem:** localStorage é vulnerável a XSS.
- **Justificativa:** Alpha não renderiza HTML de terceiros; hardening pós-Alpha inclui cookie httpOnly.

#### 6. **Antifraude por Device Fingerprint (vs. Biometria)**
- ✅ **Vantagem:** Sem integração de SDK; funciona em web.
- ❌ **Desvantagem:** Burlável por anti-detect browsers; apenas oportunista.
- **Justificativa:** Canvas fingerprint cobre 80% dos ataques; sofisticados exigem vendor comercial (Sift/Stripe).

### Arquitetura de Separação de Responsabilidades

```
┌──────────────────────────────────────────────────────┐
│ API Layer (src/api/)                                 │
│ • HTTP routing                                       │
│ • Autenticação / autorização                         │
│ • IO (BD, logging)                                   │
│ • Validação de entrada (zod)                         │
└────────────────┬─────────────────────────────────────┘
                 │
         (chama sem IO)
                 │
┌────────────────▼─────────────────────────────────────┐
│ Logic Layer (src/logic/)                             │
│ • Funções puras (sem IO)                             │
│ • Testáveis deterministicamente                      │
│ • Reutilizáveis em workers/CLI/batch                │
└────────────────────────────────────────────────────────┘

Regra: src/logic/* NÃO pode importar de src/api/*
       ↓↓ Garante pureza e testabilidade ↓↓
```

### Estrutura de Pesos e Configuração

```
data/weights.json (alterável sem deploy):
{
  "weights": {
    "frequency": 0.35,      ← Favor gig workers com ganhos frequentes
    "regularity": 0.30,     ← Penalize inconstância (risco)
    "balance": 0.25,        ← Saldo saudável é fundamental
    "diversity": 0.10       ← Futuro: múltiplas fontes de renda
  },
  "penalties": {
    "negativeBalanceDay": -2  ← -2 pontos por dia negativo (out of 1000)
  }
}

Mudança estratégica? Editar JSON + redeploy (nem touch ao código).
```

---

## 5. Limitações

### Não Implementado (Alpha)

#### 5.1 **Integração Pix Real**
- **Status:** Simulado via stub (`POST /pix/simulate`).
- **Bloqueador:** Exige parceria com PSP autorizado BACEN (Nubank, Bradesco, etc.).
- **Próximos passos:** 
  - Homologação ICP-Brasil + certificado digital.
  - Integração com API de PSP real (ex.: Bradesco OpenBanking).
  - Deploy em ambiente regulado (caixa de compensação).

#### 5.2 **Open Finance Real (DCR Automático)**
- **Status:** Mock JSON em `data/profiles/`.
- **Bloqueador:** Integração BACEN exige DCR (Data Consent Record) + homologação.
- **Próximos passos:**
  - Implementar OAuth 2.0 + conector BACEN.
  - Suportar todas as fases OFB (dados transacionais, crédito, câmbio).

#### 5.3 **Magic-Link / OAuth Social**
- **Status:** Session Bearer token em localStorage.
- **Bloqueador:** Exige SMTP ou OAuth provider (Google, Keycloak).
- **Próximos passos:**
  - Integrar Resend/SendGrid + gerar links únicos.
  - OAuth 2.0 com Google Identity Services.

#### 5.4 **ML Supervisionado**
- **Status:** Score 100% rule-based.
- **Bloqueador:** Histórico pequeno (Alpha); legal (LGPD art. 20).
- **Próximos passos:**
  - Coletar 6–12 meses de decisões.
  - Treinar modelo XGBoost com labels (aprovado/default).
  - Manter interpretabilidade SHAP.

#### 5.5 **Componente Diversidade**
- **Status:** Placeholder (weight = 0.10, mas score = 0).
- **Bloqueador:** Falta categorização de transações (Uber vs. iFood vs. autônomo).
- **Próximos passos:**
  - Integrar IA de categorização (ex.: OpenAI embeddings).
  - Medir concentration risk.

#### 5.6 **Penalidade Long Gap Between Entries**
- **Status:** Configurado mas não aplicado.
- **Bloqueador:** Complexidade em definição de "gap aceitável" (semanal? quinzenal?).
- **Próximos passos:**
  - Estudar padrões reais de gig workers.
  - Implementar rolling window de gap máximo.

#### 5.7 **Tela de Dashboard / Histórico Detalhado**
- **Status:** UI expõe decisão final, não histórico de tentativas.
- **Bloqueador:** Escopo Alpha = fluxo único; reuso não modelado.
- **Próximos passos:**
  - Página `/history` exibindo decisões anteriores.
  - Recurso de "tentar novamente" com dados atualizados.

#### 5.8 **Webhooks / API Pública para Terceiros**
- **Status:** Endpoints privados (autenticação obrigatória).
- **Bloqueador:** Sem modelo de SLA / rate limiting por cliente.
- **Próximos passos:**
  - Implementar API key per partner.
  - Webhooks para notificação de aprovação/negação.

#### 5.9 **Compliance Avançado (Auditoria regulatória)**
- **Status:** Log estruturado + hash chain (detecta tampering).
- **Bloqueador:** Sem integração com ferramenta de compliance (ex.: Drata).
- **Próximos passos:**
  - Exportar logs em formato BACEN.
  - SOC 2 Type II.

#### 5.10 **Performance — Compilação TypeScript para dist/**
- **Status:** Backend roda via `tsx` (interpretado).
- **Bloqueador:** Não é problema em Alpha; memória suficiente em Render free.
- **Próximos passos:**
  - Compilar para `dist/` (v0.2).
  - Monitorar memory leak.

### Melhorias Futuras (Roadmap Pós-Alpha)

#### **Curto Prazo (v0.2 — 2–4 semanas)**
- [ ] Compilar backend para `dist/` (performance).
- [ ] Migrar session token para cookie httpOnly (segurança).
- [ ] Implementar cleanup automático de consentimentos revogados (LGPD art. 18 — direito ao esquecimento).
- [ ] Dashboard de usuário: histórico de decisões + comparar com novas simulações.

#### **Médio Prazo (v0.3 — 1–2 meses)**
- [ ] Integração com banco real (Banco24Horas ou similar menor) para Open Finance beta.
- [ ] Magic-link via Resend + OAuth Google.
- [ ] Penalidade "long gap" implementada.
- [ ] ML: XGBoost com SHAP para explicabilidade.
- [ ] API pública com OAuth 2.0 (parceiros podem consultar score).

#### **Longo Prazo (v1.0 — trimestral)**
- [ ] Integração full BACEN (DCR automático, todas as fases OFB).
- [ ] Pix real com PSP autorizado.
- [ ] Componente diversidade: categorização automática.
- [ ] Dashboard admin: tuning de pesos em tempo real.
- [ ] Simulador de cenários: "E se eu ganhasse R$ 100 a mais/mês?"
- [ ] Notificações SMS (aprovação em 30 segundos).
- [ ] Suporte a outras modalidades: microcrédito, refinanciamento.

#### **Escalabilidade / Infra**
- [ ] Cache Redis (scores computados, perfis frequentes).
- [ ] Fila de processamento (Bull/BullMQ) para batch reprocessing.
- [ ] Sharding de banco (por data/usuário).
- [ ] CDN para assets UI (Cloudflare).

#### **Observabilidade**
- [ ] APM (Datadog / New Relic) para tracing distribuído.
- [ ] Alertas: taxa de negação > 40%, latência > 2s.
- [ ] Grafana dashboard: score distribution, approval rate, fraud detection.

#### **Conformidade**
- [ ] ISO 27001 (segurança informação).
- [ ] SOC 2 Type II.
- [ ] Certificação BCB (BACEN regulador).
- [ ] Política de retenção de dados (LGPD art. 15).

---

## Arquitetura Simplificada

```
Camadas do Projeto:

  ┌─────────────────────────────────────────────┐
  │ Frontend (React 19 + Vite)                  │
  │ Estado: Consentimento → Ingest → Decision   │
  │ HTTP: Bearer token em localStorage          │
  └──────────────┬──────────────────────────────┘
                 │ fetch() com autenticação
                 │
  ┌──────────────▼──────────────────────────────┐
  │ Backend (Fastify 5 + Node.js)               │
  │ • Roteamento HTTP                           │
  │ • Autenticação (session tokens)             │
  │ • Orquestração do motor                     │
  │ • Persistência (PostgreSQL)                 │
  │ • Logging estruturado (Pino)                │
  └──────────────┬──────────────────────────────┘
                 │ chama funções puras
                 │
  ┌──────────────▼──────────────────────────────┐
  │ Motor Puro (src/logic/)                     │
  │ • frequency, regularity, balance            │
  │ • circularity filter (antifraude)          │
  │ • score composition + decide                │
  │ • explain (justificativas)                  │
  │ Zero I/O — 100% testável                    │
  └──────────────┬──────────────────────────────┘
                 │ lê parâmetros
                 │
  ┌──────────────▼──────────────────────────────┐
  │ Config + Data (Estáticos)                   │
  │ • config/risk-presets.json                  │
  │ • config/limits.json                        │
  │ • config/antifraud.json                     │
  │ • data/weights.json                         │
  │ • data/profiles/*.json (mocks)              │
  └─────────────────────────────────────────────┘
```

---

## Como Começar

### Executar Localmente

```bash
# 1. Clonar e instalar
cd Granafacil_app
npm install

# 2. Subir infraestrutura (PostgreSQL)
docker compose up -d

# 3. Gerar Prisma + migrate
npx prisma generate
npx prisma migrate dev

# 4. Dev (3 terminais)
npm run dev              # Terminal 1: Backend :3000
npm run dev:ui           # Terminal 2: Frontend :5173
npm test                 # Terminal 3: Testes

# 5. Verificar
# Navegue para http://localhost:5173
# Fluxo completo: Consentimento → Ingest → Decision → Pix
```

### Deploy

**Vercel (Frontend):**
```bash
vercel link
vercel env add VITE_API_URL=https://seu-backend-render-url.onrender.com
vercel deploy
```

**Render (Backend):**
```bash
# Criar serviço Node em render.com
# Environment: PostgreSQL URL (de Neon/Supabase)
# Deploy: `git push` automático
```

---

## Referências Internas

- [PROJECT.md](PROJECT.md) — Visão original e stack
- [REQUIREMENTS.md](REQUIREMENTS.md) — Requisitos funcionais/não-funcionais
- [ROADMAP.md](ROADMAP.md) — Fases de desenvolvimento
- [STATE.md](STATE.md) — Status atual + desvios + decisões-chave
- [HANDOFF.md](HANDOFF.md) — Onboarding rápido

---

**Mantido com amor para Economia Gig **
