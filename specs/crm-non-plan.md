# Plano Técnico: Separação Lead × Orçamento (N.O.N.)

**Spec de referência:** [`crm-non.md`](./crm-non.md) v1.0.0
**Escopo:** criar entidade `Orcamento`, refatorar listagem de N.O.N., wirar side-effects, entregar UI consumidora.
**Versão:** 1.0.0 · **Data:** 2026-04-23

---

## 1. Gap Analysis — Estado atual × Spec

| Área | Estado atual | Spec exige | Gap | Severidade |
|---|---|---|---|---|
| Entidade Orçamento | Não existe — Lead faz papel duplo | Tabela `Orcamento` própria 1:1 ativa com Lead | 🔴 Core | CRÍTICO |
| `GET /api/crm/orcamentos` | Lista Leads | Lista Orçamentos | 🔴 Comportamento incorreto | CRÍTICO |
| Botão "Nova Oportunidade" | Redireciona pra outra tela do mesmo Lead | POST cria Orçamento | 🔴 Feature ausente | ALTO |
| Side-effect NON_OPEN_OR_CREATE | Descritor existe no statusMachine, consumer handler placeholder | Consumer cria Orçamento real | 🟡 Parcial | ALTO |
| Aceitar/Rejeitar Orçamento | Não existe | Endpoints + transições + side-effect Lead | 🔴 Ausente | ALTO |
| Expiração automática | Não existe | Job de fundo diário | 🔴 Ausente | MÉDIO |
| Histórico de Orçamento | Parcial (`non_generated` existe) | + `non_sent`/`accepted`/`rejected`/`expired` | 🟡 Incompleto | MÉDIO |
| Numeração `NON-YYYY-NNNNNN` | Não existe | Sequencial anual atômico | 🔴 Ausente | MÉDIO |
| Permissões `crm:orcamentos:*` | `orcamentos:*` existem no VALID_PERMISSIONS mas sem seed nos roles | Backfill nos roles ADM/GERENTE | 🟡 Parcial | BAIXO |
| UI Orçamento dedicada | Tela `/crm/oportunidade-de-negocio` mostra Leads | Tela nova + detalhe + edição | 🔴 Ausente | ALTO |

---

## 2. Decisões de arquitetura

### 2.1 Schema — tabela nova, sem migração de dados

Conforme decisão do usuário: `Orcamento` nasce vazia, sem backfill de Leads existentes. Isso evita risco de criar "Orçamentos fantasmas" em leads antigos que não têm os dados pra preencher corretamente.

### 2.2 Relacionamento — 1 ativo por Lead, via partial unique index

Em vez de campo `orcamentoAtivoId` no Lead (que precisaria de lock pra evitar race), usamos unique index parcial no Postgres:

```sql
CREATE UNIQUE INDEX orcamento_lead_ativo
  ON "Orcamento" ("leadId")
  WHERE status IN ('Aberto', 'Enviado', 'Em negociação') AND "deletedAt" IS NULL;
```

O banco garante que nunca haverá dois ativos pro mesmo Lead, mesmo sob race de criação simultânea. Prisma não suporta partial index diretamente no schema — usamos `@@index` sem filtro e complementamos com `npx prisma db execute` após o `db push`.

### 2.3 Numeração — Postgres SEQUENCE anual

Criamos uma sequence por ano (`orcamento_seq_2026`, `orcamento_seq_2027`, ...) ou uma sequence global com split cliente. Escolha: **sequence global** com split aplicado no service — mais simples, menor risco de lock:

```
-- Sequence global
CREATE SEQUENCE orcamento_numero_seq;

-- Geração no service:
const seqValue = await prisma.$queryRaw`SELECT nextval('orcamento_numero_seq')`;
const ano = new Date().getFullYear();
const numero = `NON-${ano}-${String(seqValue).padStart(6, '0')}`;
```

Consequência: o número vai estourar 6 dígitos por volta de 1M de Orçamentos (provável décadas). Aceitamos.

### 2.4 State machine — modular igual ao Lead

Criar `services/orcamentoStatusMachine.js` mirror do padrão do Lead:
- `validateTransition(from, to)` — retorna `{ allowed, reason }`
- `getSideEffects(to, context)` — retorna array de side-effect descriptors
- Módulo puro, sem DB, facilmente testável.

Side-effects do Orçamento:
- `LEAD_TRANSITION`: quando `→ Aceito`, transicionar Lead pra `Venda`.
- Outros estados: sem side-effect (Rejeitado/Expirado são terminais no Orçamento, não afetam Lead).

### 2.5 Orquestrador — `orcamentoService` com transações

Seguir o padrão do `leadTransitionService` (Task #8 do plan anterior):
- Todas as transições rodam dentro de `prisma.$transaction`.
- Pegam lock `FOR UPDATE` no row do Orçamento (evita race entre Aceitar/Rejeitar simultâneos).
- Ao aceitar, chamar `leadTransitionService.transitionStatus(leadId, 'Venda', ...)` dentro da mesma transação.

### 2.6 Expiração — node-cron

Adicionar `node-cron` como dep. Job `expireOrcamentos()` roda `0 3 * * *` (3h da manhã, baixo tráfego). Proteção contra execução duplicada via `redisLock` (já existe).

### 2.7 Integração Lead → Orçamento

`leadTransitionService.transitionStatus` consome side-effects do `statusMachine`. Hoje tem handlers stub. Implementar handler real:

- `NON_OPEN_OR_CREATE` com `mode='open_if_absent'`:
  - Se Lead tem Orçamento ativo → não cria, só retorna o existente.
  - Senão → cria novo Orçamento em `Aberto`.

- `NON_OPEN_OR_CREATE` com `mode='create_if_absent'`:
  - Mesmo comportamento — efetivamente o mesmo que open_if_absent dada a regra 1-ativo-por-Lead.

Ao cancelar Lead (`/cancel`), cascatear:
- Se tem Orçamento ativo → transiciona pra `Rejeitado` com motivo `"Lead cancelado: {motivo do lead}"`.

### 2.8 UI — nova rota + refactor da antiga

Rotas:
- `/crm/orcamentos` (já existe como `/crm/oportunidade-de-negocio`) — listagem. Refatorar query.
- `/crm/orcamentos/[id]` — nova rota de detalhe/edição.
- `/crm/leads/[id]` — adicionar badge do Orçamento ativo.

Mantemos `/crm/oportunidade-de-negocio` como rota legada que redireciona pra `/crm/orcamentos` (301) ou fazemos rename direto.

### 2.9 Tratamento de erros

Códigos específicos:
- 409 "Orçamento ativo já existe pro Lead (NON-XXXXX-NNNNNN)" com header `Link: /api/crm/orcamentos/{id}` pra UI fazer redirect.
- 409 "Lead cancelado não aceita novo Orçamento — reative primeiro".
- 409 "Orçamento em estado terminal não pode ser modificado".
- 404 "Nenhum Orçamento ativo pra este Lead" (endpoint shortcut).

---

## 3. Contratos API

### 3.1 Criar
```
POST /api/crm/orcamentos
body: { leadId: number }
→ 201 { id, numero, leadId, status: 'Aberto', valorTotal: null, validade: null, ... }
→ 409 { message: 'Orçamento ativo existe', orcamentoAtivo: { id, numero } }
```

### 3.2 Listar
```
GET /api/crm/orcamentos?status=&leadId=&userId=&page=&limit=
→ 200 { items: Orcamento[], page, totalPages, total }
```

### 3.3 Detalhe
```
GET /api/crm/orcamentos/:id
→ 200 { ...Orcamento, lead: { id, nome, status, ... }, criadoPor: { id, nome } }
```

### 3.4 Atualizar campos
```
PUT /api/crm/orcamentos/:id
body: { valorTotal?, validade?, condicaoPagamento?, observacoes? }
→ 200 Orcamento
→ 409 se terminal
```

### 3.5 Transições
```
PUT /api/crm/orcamentos/:id/status
body: { status: 'Aberto' | 'Enviado' | 'Em negociação' }
→ 200 Orcamento

PUT /api/crm/orcamentos/:id/aceitar
body: {}
→ 200 { orcamento, lead: { ...com novo status Venda } }

PUT /api/crm/orcamentos/:id/rejeitar
body: { motivo: string }
→ 200 Orcamento
```

### 3.6 Shortcut Lead → Orçamento ativo
```
GET /api/crm/leads/:id/orcamento
→ 200 Orcamento (ativo)
→ 404 se não houver
```

---

## 4. Estrutura de código — novos arquivos

```
backend/src/
├── domain/
│   └── orcamentoStatus.js          ← OrcamentoStatus enum, STATUS_ORDER
├── services/
│   ├── orcamentoStatusMachine.js   ← validateTransition + getSideEffects
│   ├── orcamentoService.js         ← CRUD + orquestração transacional
│   └── orcamentoNumberService.js   ← geração NON-YYYY-NNNNNN
├── controllers/
│   └── orcamentoController.js     ← handlers HTTP
├── routes/
│   └── orcamentoRoutes.js         ← mount em /api/crm/orcamentos
├── validators/
│   └── orcamentoValidator.js      ← 4 schemas Zod
├── jobs/
│   └── orcamentoExpiration.js     ← cron job
└── __tests__/
    ├── orcamentoStatusMachine.test.js
    ├── orcamentoService.test.js
    └── orcamentoValidator.test.js

front/src/
├── app/crm/orcamentos/
│   ├── page.jsx                   ← listagem (refactor)
│   └── [id]/page.jsx              ← detalhe/edição (novo)
├── components/crm/
│   ├── OrcamentoStatusBadge.jsx   ← pill de status
│   ├── OrcamentoActions.jsx       ← botões Aceitar/Rejeitar
│   ├── OrcamentoAcceptDialog.jsx  ← confirm aceite (mostra impacto no Lead)
│   ├── OrcamentoRejectDialog.jsx  ← motivo obrigatório
│   └── LeadOrcamentoBadge.jsx     ← badge no Lead detail
├── lib/
│   └── orcamentoStatus.js         ← mirror frontend
├── hooks/
│   └── useOrcamentoActions.js     ← orquestra ações
└── services/
    └── crmApi.js                  ← +6 funções (list, get, create, update, accept, reject)
```

---

## 5. Ordem de entrega — 18 tarefas

### Fase 1 — Schema + domain (backend)

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| N1.1 | `prisma/schema.prisma` — model `Orcamento` | Tabela nova + `prisma db push` em staging | Schema aplicado sem erros |
| N1.2 | Partial unique index via `prisma db execute` | Constraint ativa | Tentativa de criar 2 ativos dá erro |
| N1.3 | `domain/orcamentoStatus.js` — enum + helpers | Módulo puro | Unit test: isValid, isTerminal |
| N1.4 | `services/orcamentoStatusMachine.js` — validate + side effects | Módulo puro | Unit test com 10+ casos de transição |
| N1.5 | `services/orcamentoNumberService.js` — sequence + format | Função atômica | Teste: concurrent calls geram números únicos |

### Fase 2 — Service + endpoints

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| N2.1 | `services/orcamentoService.js` — create/read/update | CRUD básico transacional | Testes: anti-duplicação, guards |
| N2.2 | `services/orcamentoService.js` — transitionStatus | State machine wired | Test: transição inválida → error |
| N2.3 | `services/orcamentoService.js` — aceitar (dispara Lead→Venda) | Cross-entity transaction | Test: ao aceitar, Lead vira Venda |
| N2.4 | `services/orcamentoService.js` — rejeitar com motivo | Validated + histórico | Test: motivo obrigatório |
| N2.5 | `validators/orcamentoValidator.js` — 4 schemas | Zod schemas | Test com inputs válidos/inválidos |
| N2.6 | `controllers/orcamentoController.js` + `routes/orcamentoRoutes.js` | HTTP layer | Manual: endpoints respondem |
| N2.7 | Refactor `crmService.getAllOrcamentos` → consulta nova tabela | Listagem correta | Leads não aparecem mais em /orcamentos |

### Fase 3 — Integração Lead ↔ Orçamento

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| N3.1 | Handler `NON_OPEN_OR_CREATE` real no outboxWorker | Cria Orçamento quando status → Agendado vídeo/visita | Teste E2E: transição cria Orçamento ativo |
| N3.2 | Cascade cancelamento — Lead /cancel fecha Orçamento ativo | Orçamento ativo → Rejeitado | Test: cancelar Lead rejeita Orçamento ativo |
| N3.3 | Event types novos no LeadHistory (non_sent, non_accepted, non_rejected, non_expired) | Eventos registrados | Test: cada transição registra evento certo |
| N3.4 | Backfill de permissões `crm:orcamentos:*` nos roles ADM/GERENTE | Script idempotente | ADM/GERENTE conseguem acessar |

### Fase 4 — Expiração automática

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| N4.1 | Adicionar `node-cron` e job `expireOrcamentos` | Cron registrado | Log: "expireOrcamentos: N orçamentos expirados" |
| N4.2 | Proteção lock via Redis (1 instância roda por vez) | Lock funciona | Stress test com 2 processos |

### Fase 5 — UI

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| N5.1 | `services/crmApi.js` — 6 funções novas | JSDoc + exports | Import sem erro |
| N5.2 | `lib/orcamentoStatus.js` — mirror + colors | Single source frontend | Consumido pelo badge |
| N5.3 | `components/crm/OrcamentoStatusBadge.jsx` | Pill colorido | 6 variantes renderizam |
| N5.4 | `components/crm/OrcamentoAcceptDialog.jsx` + `OrcamentoRejectDialog.jsx` | 2 modais | Submit dispara endpoints |
| N5.5 | `app/crm/orcamentos/[id]/page.jsx` — tela detalhe | Página funcional | Form salva + botões funcionam |
| N5.6 | `app/crm/orcamentos/page.jsx` — refactor listagem | Mostra Orçamentos reais | Filtros funcionam |
| N5.7 | `app/crm/leads/[id]/page.jsx` — botão "Nova Oportunidade" chama POST real | Cria + redireciona | Fluxo E2E ok |
| N5.8 | `components/crm/LeadOrcamentoBadge.jsx` na edição de Lead | Mostra Orçamento ativo | Click abre Orçamento |

### Fase 6 — Validação

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| N6.1 | Smoke E2E manual em staging (§6 spec) | Fluxo completo roda | Sem 4xx/5xx inesperado |
| N6.2 | Rodar `/hm-engineer` e `/hm-qa` | Findings resolvidos ou aceitos | Nenhum CRÍTICO pendente |
| N6.3 | 24h de observação em staging | Sem regressão reportada | — |
| N6.4 | Merge master + deploy prod | Prod com schema novo | Validação idêntica em prod |

**Total:** 18 tarefas backend + 8 tarefas frontend = 26 entregas.

---

## 6. Testes

### 6.1 Unitários (backend, vitest)

Cobertura alvo:
- `orcamentoStatusMachine.test.js` — 15+ casos (transições válidas/inválidas, side-effects por estado)
- `orcamentoService.test.js` — createDuplication guard, terminalGuard, cancelLeadGuard, aceitar-dispara-Venda, rejeitar-motivo-obrigatório
- `orcamentoValidator.test.js` — 4 schemas com edge cases
- `orcamentoNumberService.test.js` — formato + unicidade sob concorrência

### 6.2 E2E manual em staging

Roteiro (~30 min):
1. Criar Lead → verificar que **NÃO aparece** em /orcamentos
2. Editar Lead → clicar "Nova Oportunidade" → ver Orçamento criado em `Aberto`
3. Preencher valor + validade + observações → salvar
4. Transicionar Aberto → Enviado → Em negociação
5. Aceitar Orçamento → ver Lead virar `Venda`
6. Tentar criar novo Orçamento no mesmo Lead → 409 com link pro ativo
7. Em outro Lead, aceitar e depois tentar editar → 409 terminal
8. Em outro Lead, transicionar pra "Agendado visita" → Orçamento criado automaticamente
9. Cancelar esse Lead → Orçamento vira Rejeitado com motivo "Lead cancelado: ..."
10. Voltar à listagem /orcamentos → ver todos com status corretos

### 6.3 Performance

- Listagem deve paginar (limit default 50). Query com index em `(status, leadId)`.
- Aceite de Orçamento roda duas transações encadeadas; `@@index` em Lead + Orçamento já existem.

---

## 7. Rollout

### 7.1 Ordem

1. Merge desta branch → `develop`
2. `cd /home/app/my-app-staging && git pull && prisma db push` + rebuild backend
3. Rebuild frontend
4. Smoke §6.2
5. 24h de observação
6. Merge master → prod

### 7.2 Feature flag

**Não necessário.** Mudanças são de domínio, não opcionais. Rollback é revert + drop table.

### 7.3 Backward compatibility

- Listagem `/api/crm/orcamentos` muda shape (agora retorna Orçamentos reais em vez de Leads). Clientes externos que consumiam esse endpoint quebram — único consumidor conhecido é o próprio frontend, que é redeploy junto.
- Rota legada `/crm/oportunidade-de-negocio` redireciona pra `/crm/orcamentos`.

---

## 8. Pontos de atenção

- ⚠️ **Partial unique index precisa ser rodado após `db push`** (Prisma não gera). Adicionar ao `prisma/migrations-raw/` como SQL manual.
- ⚠️ **Aceite de Orçamento dispara cascata no Lead** — teste casos onde Lead está em estado que não permite ir para Venda (ex: já está em Pós-venda). Decisão: se transição Lead falha, roll back aceite.
- ⚠️ **Numeração tem reset anual mas sequence é global** — split lógico. Reset real precisaria de job em 01/01 ou sequence por ano. Iterar se virar problema.
- ⚠️ **Cancelar Lead cascateia em Orçamento**, mas e se o Orçamento estiver aceito? Status do Lead já é Venda, `/cancel` é bloqueado pelo Guard 2 atual. Não deve haver caso.
- ⚠️ **Status do Orçamento não tem `Aprovado internamente`** — algumas empresas têm etapa de aprovação antes de enviar. Fora de escopo; adicionar se demanda aparecer.

---

## 9. Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Partial unique index não aplicado em prod por esquecimento | Média | Script de deploy lista os raw SQL a rodar. CI-friendly no futuro. |
| Aceite falha na transição Lead mas Orçamento vira Aceito | Baixa | Transação única envolve ambos; falha em qualquer um reverte |
| Listagem existente de Leads na tela /orcamentos quebra UX legado | Baixa | Usuários esperam ver propostas; transição é melhoria |
| Vendedor perde Orçamento em rascunho ao trocar de tela sem salvar | Média | Auto-save ou warning unsaved-changes (fora de escopo V1) |
| Cron de expiração não roda | Baixa | Health endpoint `/admin/orcamentos/expiration-stats` + log |

---

## 10. Estimativas (rough)

- Fase 1 (schema + domain): 2–3h
- Fase 2 (service + endpoints): 4–5h
- Fase 3 (integração Lead↔Orçamento): 2–3h
- Fase 4 (expiração): 1–2h
- Fase 5 (UI): 4–5h
- Fase 6 (validação): 1h + 24h de espera

**Total implementação:** ~14–19h de execução. Considerando carimbo de testes, revisão e ajustes: ~2 dias de trabalho focado.

---

## 11. Histórico

| Versão | Data | Mudanças |
|---|---|---|
| 1.0.0 | 2026-04-23 | Plano inicial pós 5-decisões do usuário |
