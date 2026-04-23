# HANDOFF — OpenScore GSD

> **COMECE POR AQUI.** Onboarding para humanos ou AIs que assumem o projeto.

## O que é
Motor de crédito para economia gig. Stack: Node + Fastify 5 + Prisma 6 (SQLite) + React 19 + Vite 5. TS strict. Framework GSD.

## Estado
**Alpha feature-complete.** 28/32 tasks (88%). Detalhes em [STATE.md](STATE.md).

- ✅ Phase 1–3, 5: código pronto, 46 testes, 100% cobertura em `src/logic/`
- 🟡 Phase 4: UI pronta, falta 4.5 (Lighthouse, exige browser)
- 🟡 Phase 6: artefatos prontos; deploy + tag dependem de ação externa

## Pendências

| Task | Quem faz |
|------|----------|
| 4.5 Lighthouse a11y ≥ 90 | Humano: `npm run preview:ui` + Chrome DevTools |
| 6.2 Deploy Render | Humano: conta Render, `DATABASE_URL`, commit do `render.yaml` |
| 6.3 Deploy Vercel | Humano: trocar `REPLACE_WITH_RENDER_URL` em `vercel.json`, importar no Vercel |
| 6.5 Tag v0.1.0-alpha | Humano: `git init` → push → `gh release create` |

## Rodar localmente
```bash
npm install
npx prisma generate && npx prisma migrate dev
npm run dev        # backend :3000
npm run dev:ui     # frontend :5173
npm test           # 46/46
```

## Documentos (ordem de leitura)
1. [PROJECT.md](PROJECT.md) — visão/stack original do produto
2. [REQUIREMENTS.md](REQUIREMENTS.md) — RFs/RNFs + inconsistências técnicas §7
3. [ROADMAP.md](ROADMAP.md) — 6 fases com tags XML `<phase>`/`<task>`/`<status>`
4. [STATE.md](STATE.md) — progresso + desvios + decisões acumuladas

## Convenções inegociáveis
- `src/logic/` é **puro** (sem IO) — RNF-02
- `config/` **sem segredos** — só parâmetros de risco
- Score **rule-based** — explicabilidade LGPD (não-ML)
- Pix/Open Finance **simulados** no Alpha — ver REQUIREMENTS §7.1/§7.2
- Testes em `tests/` espelhando estrutura de `src/`

## Desvios vs PROJECT.md (propositais, documentados)
- SQLite ↔ Postgres: trocar `provider` no schema + nova migration
- Prisma 6 (7 exige `prisma.config.ts` + adapter — fora do escopo Alpha)
- Fastify 5 escolhido (TS nativo + Pino built-in)
- Auth: session Bearer token (magic-link/OAuth pós-Alpha)
- ESLint deferido (TS strict + Prettier cobrem)

## Se for AI continuando
1. **Leia STATE.md §Desvios e §Decisões-Chave** antes de refatorar
2. Novo endpoint: schema `src/api/schemas.ts` + `requireAuth` preHandler em `src/api/<rota>.ts`
3. Tocou `DecisionLog`? Atualize `src/api/audit.ts` (hash chain) — tem teste de tampering
4. Tocou `src/logic/`? Mantenha 100% cobertura (RNF-07 >= 80%)
5. UI: componentes em `src/ui/components/`, wrapper `src/ui/api.ts` injeta Bearer via localStorage

## Pontos de atenção para deploy
- **SQLite no Render free tier é efêmero** — dados somem a cada redeploy. Para persistência real, trocar para Postgres (Neon/Supabase free) antes do primeiro deploy.
- `tsx` em produção: aceitável no Alpha; compilar para `dist/` é hardening pós-Alpha.
- Token em `localStorage`: vulnerável a XSS. Migrar para cookie httpOnly pós-Alpha.