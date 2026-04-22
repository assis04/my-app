# Plano Técnico: CRM — Núcleo

**Spec de referência:** `specs/crm.md` v1.2.0
**Escopo deste plan:** **Núcleo crítico** — LeadHistory, KanbanCard, máquina de estados com side-effects, derivação Status→Etapa, Redis lock na fila, Cancel/Reactivate, Temperatura, read-only pós-venda.
**Fora de escopo (planos separados):** Import/Export, Webhooks externos, Merge de Accounts, Transfer em massa, ações de Agenda (integração).
**Versão:** 1.0.0
**Data:** 2026-04-17

---

## 1. Gap Analysis — Estado Atual × Spec

| Área | Estado atual | Spec exige | Gap |
|---|---|---|---|
| Status inicial | `"Prospecção"` (leadCrmService:64) e `"Ativo"` (leadService:154) | `"Em prospecção"` | 🔴 Renomear + unificar |
| Etapa | Campo livre editável | Derivada do Status (§7.2) | 🔴 Lógica nova + enum |
| `KanbanCard` | Não existe — só `idKanban: String?` | Entidade FK, 1:1 com Lead | 🔴 Nova tabela |
| `LeadHistory` | Não existe | Append-only, 11 tipos de evento | 🔴 Nova tabela + serviço |
| Status machine | Update livre via `updateLead` | Endpoint dedicado com side-effects | 🔴 Novo serviço + guards |
| Temperatura | Não existe | Campo enum, manual | 🔴 Novo campo |
| `statusAntesCancelamento` | Não existe | Preenchido ao cancelar, usado ao reativar | 🔴 Novo campo |
| `canceladoEm`, `reativadoEm` | Só `deletedAt` | Campos dedicados | 🔴 Novos campos |
| Cancel/Reactivate | Único endpoint DELETE | Fluxo dedicado com escolha UI | 🔴 Novos endpoints |
| Lock da fila | `$transaction` sem lock explícito | **Redis lock distribuído** | 🔴 Race condition ativa |
| Read-only pós-venda | Não implementado | Guard no update | 🔴 Nova checagem |
| Unicidade de celular | `leadService:84` bloqueia celular duplicado | Permite N Leads → 1 Account | 🔴 Remover check |
| Código duplicado | `leadService.js` vs `leadCrmService.js` com defaults divergentes | Um único fluxo canônico de criação | 🟡 Refactor |
| Permissões novas | Não existem: `edit-after-sale`, `reactivate`, `export`, `merge` | Necessárias conforme spec §3 | 🟡 Seed de permissões |

**🔴 crítico (bloqueia implementação do núcleo)**
**🟡 importante (pode ser feito durante o núcleo)**

---

## 2. Decisões de Arquitetura

### 2.1 Máquina de estados — Transições

Implementar como **módulo puro** `backend/src/services/statusMachine.js`, sem dependência de DB. Responsabilidade única: dado `(statusAtual, statusDesejado, contexto)`, retornar `{ allowed, reason, sideEffects[] }`.

**Motivo:** testável isoladamente; não acopla lógica de negócio a transação Prisma.

```js
// shape da API do módulo
validateTransition(from, to) → { allowed: true/false, reason: string }
getSideEffects(newStatus, lead) → [{ type, payload }]
getEtapaForStatus(status) → 'Prospecção' | 'Negociação' | 'Venda' | 'Pós-venda' | 'Cancelados'
isTerminal(status) → bool
requiresAdminToEdit(status) → bool  // true para "Venda" / "Pós-venda"
```

Side-effects retornados como **descritores** (não executados dentro do módulo). Quem consome executa via orquestrador (ver §2.2).

### 2.2 Aplicação de transição — orquestrador transacional

Novo serviço `leadTransitionService.js`:

```
transitionStatus(leadId, newStatus, { reason, user, payload }) {
  BEGIN TX
    lead = SELECT ... FOR UPDATE
    validate via statusMachine
    update lead.status + lead.etapa + statusAntesCancelamento (se cancel)
    update KanbanCard.coluna
    insert LeadHistory(status_changed)
    para cada sideEffect do statusMachine:
      insert LeadHistory(correspondente)
      trigger integração externa via outbox (ver §2.6)
  COMMIT
}
```

Tudo em **uma transação**. Se qualquer passo falhar, rollback total. Nada de estado intermediário parcialmente aplicado.

### 2.3 KanbanCard

Modelo Prisma novo:

```prisma
model KanbanCard {
  id        Int      @id @default(autoincrement())
  leadId    Int      @unique @map("lead_id")
  lead      Lead     @relation(fields: [leadId], references: [id])
  coluna    String   // "Prospecção" | "Negociação" | "Venda" | "Pós-venda" | "Cancelados"
  posicao   Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([coluna, posicao])
  @@map("kanban_cards")
}
```

**Posicionamento:** `posicao` é recalculado sob demanda ao mover. Criação inicial: `MAX(posicao) + 1` dentro da coluna destino. Drag & drop do frontend envia `{ leadId, novaPosicao }`.

**Depreciação:** campo `Lead.idKanban: String?` vira legado — mantido durante 1 sprint pra migração, depois removido.

### 2.4 LeadHistory

```prisma
model LeadHistory {
  id            Int      @id @default(autoincrement())
  leadId        Int      @map("lead_id")
  lead          Lead     @relation(fields: [leadId], references: [id])
  authorUserId  Int?     @map("author_user_id")  // nullable = sistema/webhook
  authorUser    User?    @relation(fields: [authorUserId], references: [id])
  eventType     String   @map("event_type")  // enum em código, não no DB
  payload       Json
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([leadId, createdAt(sort: Desc)])
  @@index([eventType])
  @@map("lead_history")
}
```

**Append-only enforçado na camada de serviço** (`leadHistoryService.js` expõe só `add()` e `listByLead()`, nunca `update` ou `delete`). Sem trigger no DB — simplicidade é mais valiosa que defesa em profundidade aqui.

**Tipos de evento** (enum TypeScript/JSDoc em `backend/src/domain/leadEvents.js`):

```js
export const LeadEventType = Object.freeze({
  STATUS_CHANGED: 'status_changed',
  TEMPERATURA_CHANGED: 'temperatura_changed',
  VENDEDOR_TRANSFERRED: 'vendedor_transferred',
  PREVENDEDOR_TRANSFERRED: 'prevendedor_transferred',
  AGENDA_SCHEDULED: 'agenda_scheduled',
  NON_GENERATED: 'non_generated',
  LEAD_CANCELLED: 'lead_cancelled',
  LEAD_REACTIVATED: 'lead_reactivated',
  REACTIVATED_AS_NEW_LEAD: 'reactivated_as_new_lead',
  CREATED_FROM_REACTIVATION: 'created_from_reactivation',
  NOTE_ADDED: 'note_added',
  EXTERNAL_CREATED: 'external_created',
});
```

Payload por tipo é documentado no JSDoc do `leadHistoryService.js`.

### 2.5 Redis lock na Fila da Vez

**Implementação:** Redlock simplificado via `SET key value NX PX ttl` — suficiente pra 2-3 instâncias do backend (não precisa de quorum distribuído tipo Redlock canônico).

Wrapper em `backend/src/utils/redisLock.js`:

```js
async withLock(key, ttlMs, fn) {
  const token = crypto.randomUUID();
  const acquired = await redis.set(key, token, 'NX', 'PX', ttlMs);
  if (!acquired) throw new AppError('Recurso em uso, tente novamente.', 409);
  try {
    return await fn();
  } finally {
    // release atômico via Lua — só deleta se ainda somos donos
    await redis.eval(RELEASE_SCRIPT, 1, key, token);
  }
}
```

**Key:** `crm:queue:branch:{branchId}`.
**TTL:** 5 segundos (lock curto — atribuição é rápida).
**Uso:** `assignLeadQuick` e `assignLeadManual` envolvem a `$transaction` inteira dentro do lock.

**Fallback local:** se `REDIS_URL` não estiver definida (dev local), usa mutex in-memory baseado em `Map<string, Promise>` — não é seguro pra produção, mas permite rodar `npm run dev` sem Redis.

### 2.6 Integrações externas (Agenda, N.O.N.) — Outbox pattern

Side-effects que precisam chamar outros módulos (criar evento na Agenda, abrir N.O.N.) NÃO são chamadas diretas dentro da transação do Lead. Motivo: uma falha na Agenda não pode travar a mudança de status.

**Padrão:** gravar intent numa tabela `outbox` dentro da mesma transação; worker assíncrono consome e executa.

```prisma
model Outbox {
  id          Int      @id @default(autoincrement())
  aggregate   String   // "lead"
  aggregateId Int      @map("aggregate_id")
  eventType   String   @map("event_type")
  payload     Json
  status      String   @default("pending") // pending | done | failed
  attempts    Int      @default(0)
  lastError   String?  @map("last_error")
  createdAt   DateTime @default(now()) @map("created_at")
  processedAt DateTime? @map("processed_at")

  @@index([status, createdAt])
  @@map("outbox")
}
```

**Worker:** processo separado (`backend/src/workers/outboxWorker.js`) que roda em loop, processa eventos pendentes, retry com backoff exponencial. Integra com Agenda/N.O.N. via chamadas HTTP internas ou chamadas diretas a services.

**Trade-off aceito:** side-effect é **eventually consistent**, não instantâneo. Aceitável porque UX não depende de Agenda responder em < 100ms. Se for requisito no futuro, migra pra síncrono.

### 2.7 Enum de Status e Etapa

Hoje são `String` livres no Prisma. Proposta: **enum em código**, validado na entrada, **sem enum no Postgres** (pra facilitar evolução).

```js
// backend/src/domain/leadStatus.js
export const LeadStatus = Object.freeze({
  EM_PROSPECCAO: 'Em prospecção',
  AGUARDANDO_PLANTA: 'Aguardando Planta/medidas',
  AGENDADO_VIDEO: 'Agendado vídeo chamada',
  AGENDADO_VISITA: 'Agendado visita na loja',
  EM_ATENDIMENTO_LOJA: 'Em Atendimento Loja',
  VENDA: 'Venda',
  POS_VENDA: 'Pós-venda',
  CANCELADO: 'Cancelado',
});

export const LeadEtapa = Object.freeze({
  PROSPECCAO: 'Prospecção',
  NEGOCIACAO: 'Negociação',
  VENDA: 'Venda',
  POS_VENDA: 'Pós-venda',
  CANCELADOS: 'Cancelados',
});

export const STATUS_TO_ETAPA = {
  [LeadStatus.EM_PROSPECCAO]: LeadEtapa.PROSPECCAO,
  [LeadStatus.AGUARDANDO_PLANTA]: LeadEtapa.PROSPECCAO,
  [LeadStatus.AGENDADO_VIDEO]: LeadEtapa.NEGOCIACAO,
  [LeadStatus.AGENDADO_VISITA]: LeadEtapa.NEGOCIACAO,
  [LeadStatus.EM_ATENDIMENTO_LOJA]: LeadEtapa.NEGOCIACAO,
  [LeadStatus.VENDA]: LeadEtapa.VENDA,
  [LeadStatus.POS_VENDA]: LeadEtapa.POS_VENDA,
  [LeadStatus.CANCELADO]: LeadEtapa.CANCELADOS,
};
```

**Migração de dados antigos:**
- `status = "Prospecção"` → `"Em prospecção"`
- `status = "Ativo"` (leads da fila) → `"Em prospecção"`
- `status` vazio/nulo → `"Em prospecção"`
- `etapa` de todos os leads → recalcular via `STATUS_TO_ETAPA`

### 2.8 Guard de edição pós-venda

Middleware/guard em `leadCrmService.updateLead`:

```js
if (existing.status === LeadStatus.VENDA || existing.status === LeadStatus.POS_VENDA) {
  if (!user.permissions.includes('crm:leads:edit-after-sale')) {
    throw new AppError('Lead com venda concluída só pode ser editado por ADM.', 403);
  }
}
```

### 2.9 Unificação dos dois fluxos de criação

Hoje: `leadService.createQueueLead` e `leadCrmService.createLead` têm defaults divergentes.

**Plano:** `leadCrmService.createLead` vira o **fluxo canônico único**. Recebe opcional `assignmentStrategy: 'queue' | 'manual' | 'external'`. A lógica de rotação da fila (que hoje está em `leadService.rotateQueue`) é movida pra `queueAssignmentService.js` e chamada pelo fluxo canônico quando `strategy === 'queue'`.

**Remoção:** `leadService.createQueueLead` e funções relacionadas (depois que endpoints legados migrarem).

**Endpoints legados** (`/lead/quick`, `/lead/manual`) permanecem funcionando — só a implementação interna muda. Nenhuma quebra de contrato externo nesta fase.

---

## 3. Migrações Prisma (ordem de aplicação)

### Migration 1 — `add_temperatura_and_lifecycle_fields`

```prisma
model Lead {
  // ... campos existentes
  temperatura              String?   // "Muito interessado" | "Interessado" | "Sem interesse"
  statusAntesCancelamento  String?   @map("status_antes_cancelamento")
  canceladoEm              DateTime? @map("cancelado_em")
  reativadoEm              DateTime? @map("reativado_em")
}
```

**Migração de dados:** nenhuma (campos nullable).

### Migration 2 — `create_kanban_cards`

Cria tabela `kanban_cards` (seção 2.3).

**Migração de dados:** backfill — para cada Lead sem `KanbanCard`, criar um com `coluna = STATUS_TO_ETAPA[lead.status]`. Rodar via seed.

### Migration 3 — `create_lead_history`

Cria tabela `lead_history` (seção 2.4).

**Migração de dados:** nenhuma. Histórico começa vazio.

### Migration 4 — `create_outbox`

Cria tabela `outbox` (seção 2.6).

### Migration 5 — `normalize_lead_status_etapa`

Script SQL idempotente:

```sql
UPDATE leads SET status = 'Em prospecção' WHERE status IN ('Prospecção', 'Ativo') OR status IS NULL;
UPDATE leads SET etapa = CASE
  WHEN status = 'Em prospecção' THEN 'Prospecção'
  WHEN status = 'Aguardando Planta/medidas' THEN 'Prospecção'
  WHEN status = 'Agendado vídeo chamada' THEN 'Negociação'
  WHEN status = 'Agendado visita na loja' THEN 'Negociação'
  WHEN status = 'Em Atendimento Loja' THEN 'Negociação'
  WHEN status = 'Venda' THEN 'Venda'
  WHEN status = 'Pós-venda' THEN 'Pós-venda'
  WHEN status = 'Cancelado' THEN 'Cancelados'
  ELSE 'Prospecção'
END;
```

### Migration 6 — `deprecate_id_kanban` *(sprint seguinte)*

Remove `Lead.idKanban` após confirmar que nada usa mais.

### Migration 7 — `remove_unique_phone_on_lead` *(se existir)*

Checar se há constraint de unicidade em `leads.celular`. Se houver, remover — spec permite N Leads por Account/celular.

---

## 4. Contratos de API

### 4.1 `PUT /api/crm/leads/:id/status`

**Request:**
```json
{
  "status": "Agendado vídeo chamada",
  "motivo": "opcional — obrigatório só pra Cancelado",
  "contexto": { "agendadoPara": "2026-04-20T14:00:00Z" }
}
```

**Response 200:**
```json
{
  "lead": { /* Lead atualizado, etapa já recalculada */ },
  "kanbanCard": { /* card atualizado */ },
  "historyEvent": { "id": 123, "eventType": "status_changed", ... },
  "outboxEvents": [{ "eventType": "agenda_scheduled", "status": "pending" }]
}
```

**Erros:**
- 400 transição inválida (`{ error: 'Transição não permitida: X → Y' }`)
- 403 sem permissão (edição pós-venda ou filial errada)
- 404 Lead não existe

### 4.2 `PUT /api/crm/leads/:id/cancel`

**Request:** `{ "motivo": "Desistência do cliente" }` (motivo obrigatório)

**Response 200:** mesma shape que `/status`.

**Invariantes:**
- Preenche `statusAntesCancelamento` com status atual antes de mudar
- Preenche `canceladoEm`
- Status final = `"Cancelado"`

### 4.3 `PUT /api/crm/leads/:id/reactivate`

**Request:**
```json
{
  "modo": "reativar" | "novo",
  "motivo": "Cliente voltou a demonstrar interesse"
}
```

**Response 200 (modo="reativar"):** Lead atualizado, status = `statusAntesCancelamento` ou `"Em prospecção"`.

**Response 201 (modo="novo"):**
```json
{
  "leadAntigo": { /* permanece Cancelado, com history event reactivated_as_new_lead */ },
  "leadNovo": { /* novo Lead com status "Em prospecção", vinculado ao mesmo contaId */ }
}
```

**Permissão:** `crm:leads:reactivate`

### 4.4 `PUT /api/crm/leads/:id/temperatura`

**Request:** `{ "temperatura": "Muito interessado" | "Interessado" | "Sem interesse" }`

**Response 200:** Lead atualizado + evento `temperatura_changed` no histórico.

### 4.5 `GET /api/crm/leads/:id/history`

**Response 200:**
```json
{
  "items": [
    { "id": 42, "eventType": "status_changed", "payload": {...}, "authorUser": {...}, "createdAt": "..." },
    ...
  ]
}
```

Ordenado por `createdAt DESC`. Paginação via `?cursor` se > 100 eventos.

### 4.6 Atualização no `GET /api/crm/leads/:id`

**Response 200:** agora inclui `history` (últimos 20 eventos) e `kanbanCard` no `include`.

---

## 5. Camadas de Código — Estrutura Nova

```
backend/src/
├── domain/
│   ├── leadStatus.js          ← LeadStatus, LeadEtapa, STATUS_TO_ETAPA
│   ├── leadEvents.js          ← LeadEventType (enum)
│   └── permissions.js         ← lista canônica de permissões
├── services/
│   ├── statusMachine.js       ← puro, testável isoladamente
│   ├── leadTransitionService.js ← orquestrador transacional
│   ├── leadHistoryService.js  ← append-only wrapper
│   ├── queueAssignmentService.js ← extraído de leadService
│   └── outboxService.js
├── utils/
│   └── redisLock.js
├── workers/
│   └── outboxWorker.js
└── validators/
    └── leadStatusValidator.js ← Joi schemas para os novos endpoints
```

**Princípio:** nada de novo encostar em `leadController.js` / `leadService.js` legados. Novo código vive em pastas novas, endpoints novos. Depois migração.

---

## 6. Ordem de Entrega (tasks sequenciais)

Cada tarefa é pequena o suficiente pra caber em 1 PR. Critério de aceitação ao final de cada.

| # | Tarefa | Entregável | Critério de aceitação |
|---|---|---|---|
| 1 | Criar `domain/leadStatus.js` + `domain/leadEvents.js` | Enums + mapa STATUS_TO_ETAPA | Testes unitários cobrindo todas as transições e mapeamentos |
| 2 | Criar `services/statusMachine.js` | Módulo puro | Testes: transições válidas, inválidas, terminais, side-effects por status |
| 3 | Migration 1 (campos novos no Lead) | Prisma migrate aplicado | `npx prisma migrate dev` passa; Lead tem os 4 campos novos |
| 4 | Migration 5 (normalize status/etapa) | Dados migrados | Nenhum Lead com status legado (`Prospecção`/`Ativo`) |
| 5 | Migration 2 (KanbanCard) + backfill | Tabela + 1 card por Lead existente | `SELECT COUNT(*) FROM leads l LEFT JOIN kanban_cards k ON k.lead_id = l.id WHERE k.id IS NULL` retorna 0 |
| 6 | Migration 3 (LeadHistory) | Tabela criada | schema validado |
| 7 | `services/leadHistoryService.js` | Funções `add()`, `listByLead()`, `listByLeadPaginated()` | Testes de integração: insert + list |
| 8 | `services/leadTransitionService.js` | Função `transitionStatus()` transacional | Testes: feliz, violação de transição, Kanban sincronizado, history gerado |
| 9 | Endpoint `PUT /leads/:id/status` | Controller + rota + validator | E2E: muda status, verifica side-effects |
| 10 | Endpoint `PUT /leads/:id/temperatura` | Controller + rota + validator | E2E: muda temperatura, history registrado |
| 11 | Endpoint `PUT /leads/:id/cancel` | Controller + rota + validator | E2E: cancela, `statusAntesCancelamento` preenchido, etapa = Cancelados |
| 12 | Endpoint `PUT /leads/:id/reactivate` | Controller com branches "reativar"/"novo" | E2E: ambos os modos, history correto em ambos |
| 13 | Endpoint `GET /leads/:id/history` + include em `GET /leads/:id` | Controller atualizado | Retorna eventos paginados |
| 14 | Guard de edição pós-venda em `updateLead` | Checagem na service | E2E: non-admin recebe 403 ao editar Venda |
| 15 | Migration 4 (Outbox) + `services/outboxService.js` | Infra | Testes: insert pendente, processar, retry |
| 16 | `workers/outboxWorker.js` | Worker rodando | Integração: outbox → Agenda (mock), retry em falha |
| 17 | `utils/redisLock.js` | Lock com fallback local | Testes: concorrência simulada, release atômico |
| 18 | Aplicar Redis lock em `assignLeadQuick` / `assignLeadManual` | Fila protegida | Teste de carga: 100 requests concorrentes, 0 duplicatas |
| 19 | Remover check de unicidade de celular no Lead (se existir) | Migration 7 | Dois Leads com mesmo celular podem coexistir |
| 20 | Seed de novas permissões | `crm:leads:edit-after-sale`, `crm:leads:reactivate`, etc | Perms no banco, associadas aos roles corretos |
| 21 | Unificar fluxo de criação (leadService → leadCrmService) | Refactor | Endpoints legados funcionam sem mudança; `leadService.createQueueLead` removido |
| 22 | Deprecar `Lead.idKanban` — Migration 6 | Campo removido | Frontend migrado pra usar `kanbanCard.id` |

**Duração estimada:** 4-6 sprints de 1 semana, dependendo de ritmo de code review.

**Paralelização possível:**
- Tasks 1-2 (domain + statusMachine) em paralelo com 3-6 (migrations)
- Tasks 15-18 (outbox + Redis) em paralelo com 7-14 (history + endpoints)

---

## 7. Testes

### 7.1 Testes unitários (obrigatórios)

- `statusMachine` — todas as transições válidas e inválidas, side-effects por status
- `leadHistoryService` — append-only verificado (tentativa de update deve falhar em test)
- `redisLock` — aquisição, contenção, release atômico

### 7.2 Testes de integração

- Fluxo completo de cada endpoint novo (6 endpoints)
- Transação atômica: falha no meio → rollback completo (ex: simular falha no KanbanCard update)
- Outbox: evento pendente → processado → `status=done`
- Filial isolation: gerente de filial A não consegue transicionar status de lead de filial B

### 7.3 Teste de carga (mínimo)

- 100 requests concorrentes em `/lead/quick` da mesma filial → 100 leads criados, 0 duplicações de atribuição

---

## 8. Observabilidade

Adicionar métricas (Prometheus/OpenTelemetry — stack a definir no plano de observabilidade):

- `lead_status_transition_total{from, to}` — contador
- `lead_created_total{fonte}` — contador
- `lead_queue_assignment_duration_seconds` — histogram
- `outbox_pending_count` — gauge (alerta se > 100 ou idade > 5min)
- `redis_lock_contention_total{resource}` — contador

**Log estruturado** (JSON) para todos os endpoints de transição — inclui `leadId`, `userId`, `from`, `to`, `durationMs`.

---

## 9. Rollout & Segurança

### 9.1 Deploy order

1. Deploy do backend com migrations 1-4 em **staging** (ver feedback `feedback_deploy_order.md`)
2. Validar com dados reais de staging (copiar dump)
3. Migration 5 em staging → validar que estados/etapas estão coerentes
4. Deploy em produção (backend com código novo + migrations)
5. Rodar seed de permissões
6. Frontend novo (consome endpoints novos) em sprint seguinte

### 9.2 Feature flag

Expor um env var `CRM_STATUS_MACHINE_ENABLED=true|false`. Se `false`, endpoints novos retornam 503. Permite rollback sem revert de deploy.

### 9.3 Compatibilidade

Endpoints antigos (`PUT /leads/:id` para update genérico) **continuam funcionando** mas rejeitam mudança de `status` — redireciona para o novo endpoint dedicado com HTTP 400 e mensagem clara ("Use PUT /leads/:id/status para transições de status").

---

## 10. Pontos de atenção e riscos

- ⚠️ **Migration 5 é irreversível sem backup.** Procedimento: backup do Postgres antes, dry-run em staging primeiro.
- ⚠️ **Outbox worker como single point of failure.** Se cair, side-effects acumulam. Mitigação: alerta em `outbox_pending_count > 100`.
- ⚠️ **Redis como dependência nova na hot path.** Se Redis cair, fila trava. Mitigação: timeout curto (5s) + fallback pra transação Postgres com SELECT FOR UPDATE se Redis não responder.
- ⚠️ **Frontend não preparado** — tasks 9-14 assumem que o frontend vai consumir os novos endpoints. Paralelamente precisa do plano de frontend (fora de escopo deste plan).
- ⚠️ **Dívidas pós-núcleo ainda em aberto:** Import/Export, Webhooks externos, Merge de Accounts, Transfer em massa — todos viram plans separados.

---

## 11. Definition of Done do núcleo

- [ ] Todas as 22 tasks da §6 concluídas com PRs mergeados
- [ ] Cobertura de testes ≥ 80% em `statusMachine`, `leadTransitionService`, `leadHistoryService`
- [ ] Métricas de §8 publicadas
- [ ] 1 semana em produção sem incidente
- [ ] Spec `specs/crm.md` revisada — §12 fecha os 3 TBDs pendentes ou promove a plans separados
- [ ] Documentação de API (OpenAPI/Swagger) atualizada

---

## 12. Histórico

| Versão | Data | Mudanças |
|---|---|---|
| 1.0.0 | 2026-04-17 | Plano inicial do núcleo CRM |
